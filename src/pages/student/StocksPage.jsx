import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  collection, doc, query, where, orderBy, limit as qlimit,
  onSnapshot, getDocs, addDoc, runTransaction, increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt, periodKeys, rankAssets } from '../../lib/util';
import {
  changePct, MARKET_PATH, MARKET_LABEL, DEFAULT_FX, DEFAULT_KRW_PER_UNIT,
  pendingSchedule, SCHEDULE_LABEL, stockCur, WALLET_FIELD,
} from '../../lib/stocks';
import { applyScheduledTicks } from '../../lib/marketSync';
import { isActiveStudent } from '../../lib/studentState';
import { TAX_LEDGER_ID, stockTradeTax } from '../../lib/taxes';

const stockTaxToClassUnits = (amount, cur, fx, kpu) => {
  const value = Math.max(0, Number(amount) || 0);
  if (cur === 'USD') return Math.floor((value * fx) / kpu);
  if (cur === 'KRW') return Math.floor(value / kpu);
  return Math.floor(value);
};

/* 미니 차트 */
function Spark({ data, up }) {
  if (!data || data.length < 2) return <div className="w-16" />;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 60},${22 - ((v - min) / r) * 20}`).join(' ');
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" className="shrink-0">
      <polyline points={pts} fill="none" stroke={up ? '#ef4444' : '#3b82f6'} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function StocksPage() {
  const { klass, student } = useOutletContext();
  const [market, setMarket] = useState(null);
  const [tab, setTab] = useState('market');   // market | rank | log
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const stocks = (market?.stocks || []).map((s) => ({ id: s.symbol, ...s }));
  const fx = market?.fx || DEFAULT_FX;

  // 시장 전체가 문서 1개 — 읽기 비용이 예전의 1/20이에요
  useEffect(() => {
    return onSnapshot(doc(db, ...MARKET_PATH(klass.id)), (snap) => {
      setMarket(snap.exists() ? snap.data() : null);
    });
  }, [klass.id]);

  // 예약 시세 변동(아침 8:30 · 오후 3:00) — 밀린 게 있으면 딱 한 번 적용
  useEffect(() => {
    if (market && pendingSchedule(market).length) applyScheduledTicks(klass.id);
  }, [market, klass.id]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const kpu = Number(klass.krwPerUnit) || DEFAULT_KRW_PER_UNIT;
  const isUS = (s) => s?.market === 'US';
  /** 종목 가격을 그 종목의 통화로 표시 */
  const priceLabel = (s) => {
    const c = stockCur(s);
    if (c === 'USD') return `$${fmt(s.price)}`;
    if (c === 'KRW') return `${fmt(s.price)}원`;
    return `${fmt(s.price)} ${klass.currency}`;
  };
  const curMark = (s) => ({ USD: '$', KRW: '', UNIT: '' }[stockCur(s)]);
  const curSuffix = (s) => ({ USD: '', KRW: '원', UNIT: ` ${klass.currency}` }[stockCur(s)]);
  /** 학급화폐로 환산한 값 (총액 비교용) */
  const inUnits = (amount, s) => {
    const c = stockCur(s);
    if (c === 'USD') return (amount * fx) / kpu;
    if (c === 'KRW') return amount / kpu;
    return amount;
  };

  const trade = async (side) => {
    const n = Math.floor(Number(qty));
    if (!sel || n < 1) return;
    const marketRef = doc(db, ...MARKET_PATH(klass.id));
    const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
    const classRef = doc(db, 'classes', klass.id);
    const ledgerRef = doc(db, 'classes', klass.id, 'taxLedger', TAX_LEDGER_ID);
    let logged = null;
    try {
      await runTransaction(db, async (tx) => {
        const mkt = (await tx.get(marketRef)).data();
        const s = (await tx.get(studentRef)).data();
        const settings = { ...klass, ...((await tx.get(classRef)).data() || {}) };
        const st = (mkt?.stocks || []).find((x) => x.symbol === sel.id);
        if (!st) throw new Error('지금은 거래할 수 없는 종목이에요.');
        const price = st.price;
        const cur = stockCur(st);                 // KRW(한국) / USD(미국) / UNIT(우리 반)
        const field = WALLET_FIELD[cur];
        const wallet = s[field] || 0;
        const h = s.holdings?.[sel.id] || { qty: 0, avg: 0 };
        const currentFx = Number(mkt.fx) || fx;
        const currentKpu = Number(settings.krwPerUnit) || kpu;
        const baseAmount = price * n;
        const taxPart = side === 'buy' ? 'stockBuy' : 'stockSell';
        const tradeTax = stockTradeTax(side, price, n, h);
        const taxNative = tradeTax.tax;
        const taxFund = stockTaxToClassUnits(taxNative, cur, currentFx, currentKpu);
        const need = {
          KRW: '원이 부족해요! 은행 환전소에서 원(₩)으로 바꿔 오세요 💱',
          USD: '달러가 부족해요! 은행 환전소에서 달러($)로 바꿔 오세요 💱',
          UNIT: `${klass.currency}가 부족해요!`,
        }[cur];

        if (side === 'buy') {
          const cost = baseAmount;
          const debit = cost;
          if (wallet < debit) throw new Error(need);
          const nq = h.qty + n;
          tx.update(studentRef, {
            [field]: Math.round((wallet - debit) * 100) / 100,
            [`holdings.${sel.id}`]: {
              qty: nq,
              avg: Math.round(((h.avg * h.qty + debit) / nq) * 100) / 100,
              cur,
            },
          });
          logged = { price, total: cost, cur, tax: 0, taxFund: 0, net: -debit, profit: null, grossProfit: 0 };
        } else {
          if (h.qty < n) throw new Error('보유 수량이 부족해요!');
          const nq = h.qty - n;
          const gain = price * n;
          const netGain = gain - taxNative;
          tx.update(studentRef, {
            [field]: Math.round((wallet + netGain) * 100) / 100,
            [`holdings.${sel.id}`]: nq === 0 ? { qty: 0, avg: 0, cur } : { qty: nq, avg: h.avg, cur },
          });
          logged = {
            price, total: gain, cur, tax: taxNative, taxFund, net: netGain,
            grossProfit: Math.round(tradeTax.grossProfit * 100) / 100,
            profit: Math.round((tradeTax.grossProfit - taxNative) * 100) / 100,
          };
        }
        if (taxFund > 0) {
          tx.set(ledgerRef, {
            pending: increment(taxFund),
            [taxPart]: increment(taxFund),
            updatedAt: Date.now(),
          }, { merge: true });
        }
      });

      // 📒 매매일지 기록 (데이터가 차곡차곡 쌓여요)
      await addDoc(collection(db, 'classes', klass.id, 'trades'), {
        studentId: student.id,
        studentName: student.name,
        symbol: sel.id,
        name: sel.name,
        market: sel.market,
        side,
        qty: n,
        price: logged.price,
        total: logged.total,
        tax: logged.tax,
        taxFund: logged.taxFund,
        net: logged.net,
        cur: logged.cur,
        grossProfit: logged.grossProfit,
        profit: logged.profit,
        at: Date.now(),
        createdAt: serverTimestamp(),
      });

      flash('ok', side === 'buy'
        ? `📈 ${sel.name} ${n}주 매수 완료! 매수 세금은 없어요.`
        : `📉 ${sel.name} ${n}주 매도 완료! 이익 ${fmt(logged.grossProfit)} 중 세금 ${fmt(logged.tax)}${logged.cur}를 누적했어요.`);
      setSel(null); setQty(1);
    } catch (e) {
      flash('err', e.message);
    }
  };

  const holdings = Object.entries(student.holdings || {})
    .filter(([, h]) => h.qty > 0)
    .map(([sym, h]) => ({ sym, ...h, stock: stocks.find((s) => s.id === sym) }))
    .filter((h) => h.stock);
  // 전체 평가액을 학급화폐로 환산해서 한 줄로 보여줘요
  const totalValue = holdings.reduce((a, h) => a + inUnits(h.stock.price * h.qty, h.stock), 0);

  const list = stocks.filter((s) => filter === 'ALL' || s.market === filter);
  const previewQty = Math.max(1, Math.floor(Number(qty) || 1));
  const previewHolding = sel ? (student.holdings?.[sel.id] || { qty: 0, avg: 0 }) : { qty: 0, avg: 0 };
  const previewSellTax = sel ? stockTradeTax('sell', sel.price, previewQty, previewHolding) : { tax: 0, grossProfit: 0 };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-2xl text-blue-600">📈 주식 투자</h2>
        <span className="text-xs bg-white rounded-xl px-3 py-1 text-gray-500 shadow-sm">
          💱 1$ = {fmt(fx)} {klass.currency}
        </span>
        <span className="text-xs text-gray-400 hidden sm:inline">⏰ {SCHEDULE_LABEL} 자동 변동</span>
      </div>

      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-2">
        {[['market', '📊 시장'], ['rank', '🏆 랭킹'], ['log', '📒 매매일지']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-2xl transition ${tab === id ? 'bg-blue-500 text-white shadow' : 'bg-white text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'rank' && <RankBoard klass={klass} student={student} stocks={stocks} fx={fx} kpu={kpu} />}
      {tab === 'log' && <TradeLog klass={klass} student={student} />}

      {tab === 'market' && (
        <>
          {/* 내 지갑 */}
          <div className="bg-white rounded-3xl shadow p-4 flex flex-wrap gap-4 items-center">
            <span className="text-sm text-gray-400">내 지갑</span>
            <span className="text-amber-600">💵 {fmt(student.cash)} {klass.currency}</span>
            <span className="text-blue-600">🇰🇷 {fmt(student.krw || 0)}원</span>
            <span className="text-emerald-600">🇺🇸 ${fmt(student.usd || 0)}</span>
            <Link to="/student/bank" className="ml-auto text-sm text-blue-500 underline">💱 환전소 가기 →</Link>
          </div>

          {/* 내 보유 주식 */}
          {holdings.length > 0 && (
            <div className="bg-white rounded-3xl shadow p-5">
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <h3 className="text-lg">💼 내 주식</h3>
                <div className="text-blue-600 tabular-nums text-sm">
                  평가액 {fmt(Math.round(totalValue))} {klass.currency}
                </div>
              </div>
              {holdings.map((h) => {
                const profit = Math.round((h.stock.price - h.avg) * h.qty * 100) / 100;
                return (
                  <button
                    key={h.sym}
                    onClick={() => { setSel(h.stock); setQty(1); }}
                    className="w-full flex items-center gap-2 py-2 border-b border-gray-100 text-left hover:bg-blue-50/50 rounded-lg px-1"
                  >
                    <span>{MARKET_LABEL[h.stock.market] || '🏫'}</span>
                    <span className="flex-1">{h.stock.name} <span className="text-gray-400 text-sm">{h.qty}주</span></span>
                    <span className="tabular-nums text-sm">
                      {curMark(h.stock)}{fmt(Math.round(h.stock.price * h.qty * 100) / 100)}{curSuffix(h.stock)}
                    </span>
                    <span className={`w-24 text-right text-sm tabular-nums ${profit > 0 ? 'text-red-500' : profit < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                      {profit >= 0 ? '+' : ''}{curMark(h.stock)}{fmt(profit)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 시장 */}
          <div className="bg-white rounded-3xl shadow p-5">
            <div className="flex gap-2 mb-3 flex-wrap">
              {[['ALL', '전체'], ['KR', '🇰🇷 한국'], ['US', '🇺🇸 미국($)'], ['CUSTOM', '🏫 우리반']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`px-3 py-1 rounded-xl text-sm ${filter === id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {list.map((s) => {
              const pct = changePct(s);
              return (
                <button
                  key={s.id}
                  onClick={() => { setSel(s); setQty(1); }}
                  className="w-full flex items-center gap-2 py-2 border-b border-gray-100 text-left hover:bg-blue-50/50 rounded-lg px-1"
                >
                  <span>{MARKET_LABEL[s.market] || '🏫'}</span>
                  <span className="flex-1">{s.name}</span>
                  <Spark data={s.history} up={pct >= 0} />
                  <span className="w-24 text-right tabular-nums text-sm">{priceLabel(s)}</span>
                  <span className={`w-16 text-right text-sm tabular-nums ${pct > 0 ? 'text-red-500' : pct < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                    {pct > 0 ? '▲' : pct < 0 ? '▼' : '−'}{Math.abs(pct).toFixed(1)}%
                  </span>
                </button>
              );
            })}
            {!stocks.length && (
              <div className="text-center text-gray-400 py-8">아직 주식 시장이 열리지 않았어요. 선생님이 곧 열어 주실 거예요!</div>
            )}
          </div>
        </>
      )}

      {/* 매매 모달 */}
      {sel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSel(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl mb-1">{MARKET_LABEL[sel.market] || '🏫'} {sel.name}</h3>
            <div className="text-3xl text-blue-600 tabular-nums mb-1">{priceLabel(sel)}</div>
            <div className="text-sm text-gray-400 mb-4">
              보유 {(student.holdings?.[sel.id]?.qty || 0)}주 · 내 지갑{' '}
              {{
                USD: `$${fmt(student.usd || 0)}`,
                KRW: `${fmt(student.krw || 0)}원`,
                UNIT: `${fmt(student.cash)} ${klass.currency}`,
              }[stockCur(sel)]}
            </div>
            {stockCur(sel) !== 'UNIT' && (
              <div className="bg-emerald-50 text-emerald-700 text-xs rounded-xl px-3 py-2 mb-3">
                {stockCur(sel) === 'USD'
                  ? <>🇺🇸 미국 주식은 <b>달러($)</b>로 사고팔아요.</>
                  : <>🇰🇷 한국 주식은 <b>원(₩)</b>으로 사고팔아요.</>}
                {' '}없으면 은행 <b>환전소</b>에서 바꿔 오세요! 💱
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-xl bg-gray-100 text-xl">−</button>
              <input
                type="number" min="1" value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="flex-1 text-center rounded-xl border-2 border-gray-200 py-2 text-xl outline-none"
              />
              <button onClick={() => setQty(Number(qty) + 1)} className="w-10 h-10 rounded-xl bg-gray-100 text-xl">+</button>
            </div>
            <div className="text-center text-gray-500 mb-4 tabular-nums">
              총 {curMark(sel)}
              {fmt(Math.round(sel.price * Math.max(1, Math.floor(Number(qty) || 1)) * 100) / 100)}
              {curSuffix(sel)}
            </div>
            <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-700">
              매수 세금 0 · 매도 이익 세금 {fmt(previewSellTax.tax)} (예상 이익 {fmt(previewSellTax.grossProfit)}) {curSuffix(sel) || stockCur(sel)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => trade('buy')} className="flex-1 rounded-2xl py-3 bg-red-500 hover:bg-red-600 text-white text-lg">매수</button>
              <button onClick={() => trade('sell')} className="flex-1 rounded-2xl py-3 bg-blue-500 hover:bg-blue-600 text-white text-lg">매도</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 🏆 우리 반 랭킹 (오늘 / 이번 주 / 이번 달) ---------- */
function RankBoard({ klass, student, stocks, fx, kpu }) {
  const [rows, setRows] = useState(null);
  const [period, setPeriod] = useState('d');

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'classes', klass.id, 'students'));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent));
    })();
  }, [klass.id, period]);

  if (!rows) return <div className="bg-white rounded-3xl shadow p-8 text-center text-gray-400">랭킹을 불러오는 중...</div>;

  const keys = periodKeys();
  const ranked = rows
    .map((r) => {
      const now = rankAssets(r, stocks, fx, kpu);
      const base = r.snap?.[period];
      // 기준 기록이 없거나 기간이 바뀌었으면 아직 변화 없음(0)으로 봐요
      const start = base && base.k === keys[period] ? base.v : now;
      return { ...r, now, gain: now - start, rate: start > 0 ? ((now - start) / start) * 100 : 0 };
    })
    .sort((a, b) => b.gain - a.gain);

  const medal = ['🥇', '🥈', '🥉'];
  const label = { d: '오늘', w: '이번 주', m: '이번 달' };

  return (
    <div className="bg-white rounded-3xl shadow p-5">
      <div className="flex gap-2 mb-3">
        {[['d', '오늘'], ['w', '이번 주'], ['m', '이번 달']].map(([id, t]) => (
          <button
            key={id}
            onClick={() => setPeriod(id)}
            className={`px-4 py-1.5 rounded-xl text-sm ${period === id ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{label[period]} 얼마나 늘었나 순위</span>
      </div>
      {ranked.map((r, i) => {
        const me = r.id === student.id;
        return (
          <div
            key={r.id}
            className={`flex items-center gap-2 py-2 border-b border-gray-100 rounded-lg px-2 ${me ? 'bg-amber-50' : ''}`}
          >
            <span className="w-8 text-center">{medal[i] || <span className="text-gray-400 text-sm">{i + 1}</span>}</span>
            <span className="text-xl">{r.avatar?.base || '🙂'}</span>
            <span className={`flex-1 ${me ? 'text-amber-700' : ''}`}>{r.name}{me && ' (나)'}</span>
            <span className="text-sm text-gray-400 tabular-nums hidden sm:inline">{fmt(r.now)}</span>
            <span className={`w-24 text-right tabular-nums ${r.gain > 0 ? 'text-red-500' : r.gain < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
              {r.gain >= 0 ? '+' : ''}{fmt(r.gain)}
            </span>
          </div>
        );
      })}
      {!ranked.length && <div className="text-center text-gray-400 py-6">아직 친구들이 없어요.</div>}
      <p className="text-xs text-gray-400 mt-3">
        * 총자산 = 현금 + 예금 + 달러 + 주식 평가액. {label[period]} 시작할 때와 비교한 금액이에요.
      </p>
    </div>
  );
}

/* ---------- 📒 매매일지 ---------- */
function TradeLog({ klass, student }) {
  const [rows, setRows] = useState(null);
  const [mine, setMine] = useState(true);

  useEffect(() => {
    const base = collection(db, 'classes', klass.id, 'trades');
    const q = mine
      ? query(base, where('studentId', '==', student.id), orderBy('at', 'desc'), qlimit(50))
      : query(base, orderBy('at', 'desc'), qlimit(50));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id, student.id, mine]);

  return (
    <div className="bg-white rounded-3xl shadow p-5">
      <div className="flex gap-2 mb-3">
        {[[true, '내 기록'], [false, '우리 반 전체']].map(([v, t]) => (
          <button
            key={String(v)}
            onClick={() => setMine(v)}
            className={`px-4 py-1.5 rounded-xl text-sm ${mine === v ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {!rows ? (
        <div className="text-center text-gray-400 py-6">불러오는 중...</div>
      ) : !rows.length ? (
        <div className="text-center text-gray-400 py-8">아직 거래 기록이 없어요. 첫 투자를 해보세요! 📈</div>
      ) : (
        rows.map((t) => (
          <div key={t.id} className="flex items-center gap-2 py-2 border-b border-gray-100 text-sm">
            <span className={`px-2 py-0.5 rounded-lg text-xs ${t.side === 'buy' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {t.side === 'buy' ? '매수' : '매도'}
            </span>
            <span className="flex-1">
              {!mine && <b className="text-gray-500">{t.studentName} </b>}
              {t.name} <span className="text-gray-400">{t.qty}주</span>
            </span>
            <span className="tabular-nums text-gray-500">
              {t.cur === 'USD' ? '$' : ''}{fmt(t.total)}
            </span>
            {t.side === 'sell' && t.profit != null && (
              <span className={`w-20 text-right tabular-nums ${t.profit > 0 ? 'text-red-500' : t.profit < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                {t.profit >= 0 ? '+' : ''}{t.cur === 'USD' ? '$' : ''}{fmt(t.profit)}
              </span>
            )}
            <span className="text-[11px] text-gray-300 w-16 text-right hidden sm:block">
              {new Date(t.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
