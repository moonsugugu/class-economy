import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { changePct } from '../../lib/stocks';

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
  const [stocks, setStocks] = useState([]);
  const [sel, setSel] = useState(null); // 선택된 종목
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState(null);
  const [market, setMarket] = useState('ALL');

  useEffect(() => {
    return onSnapshot(collection(db, 'classes', klass.id, 'stocks'), (snap) =>
      setStocks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [klass.id]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const trade = async (side) => {
    const n = Math.floor(Number(qty));
    if (!sel || n < 1) return;
    const stockRef = doc(db, 'classes', klass.id, 'stocks', sel.id);
    const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
    try {
      await runTransaction(db, async (tx) => {
        const st = (await tx.get(stockRef)).data();
        const s = (await tx.get(studentRef)).data();
        const price = st.price;
        const h = s.holdings?.[sel.id] || { qty: 0, avg: 0 };
        if (side === 'buy') {
          const cost = price * n;
          if (s.cash < cost) throw new Error('현금이 부족해요!');
          const nq = h.qty + n;
          tx.update(studentRef, {
            cash: s.cash - cost,
            [`holdings.${sel.id}`]: { qty: nq, avg: Math.round((h.avg * h.qty + cost) / nq) },
          });
        } else {
          if (h.qty < n) throw new Error('보유 수량이 부족해요!');
          const nq = h.qty - n;
          tx.update(studentRef, {
            cash: s.cash + price * n,
            [`holdings.${sel.id}`]: nq === 0 ? { qty: 0, avg: 0 } : { qty: nq, avg: h.avg },
          });
        }
      });
      flash('ok', side === 'buy' ? `📈 ${sel.name} ${n}주 매수 완료!` : `📉 ${sel.name} ${n}주 매도 완료!`);
      setSel(null); setQty(1);
    } catch (e) {
      flash('err', e.message);
    }
  };

  const holdings = Object.entries(student.holdings || {})
    .filter(([, h]) => h.qty > 0)
    .map(([sym, h]) => ({ sym, ...h, stock: stocks.find((s) => s.id === sym) }))
    .filter((h) => h.stock);
  const totalValue = holdings.reduce((a, h) => a + h.stock.price * h.qty, 0);

  const list = stocks.filter((s) => market === 'ALL' || s.market === market);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-blue-600">📈 주식 투자</h2>
      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {/* 내 보유 주식 */}
      {holdings.length > 0 && (
        <div className="bg-white rounded-3xl shadow p-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg">💼 내 주식</h3>
            <div className="text-blue-600 tabular-nums">평가액 {fmt(totalValue)} {klass.currency}</div>
          </div>
          {holdings.map((h) => {
            const profit = (h.stock.price - h.avg) * h.qty;
            return (
              <button
                key={h.sym}
                onClick={() => setSel(h.stock)}
                className="w-full flex items-center gap-2 py-2 border-b border-gray-100 text-left hover:bg-blue-50/50 rounded-lg px-1"
              >
                <span className="flex-1">{h.stock.name} <span className="text-gray-400 text-sm">{h.qty}주</span></span>
                <span className="tabular-nums">{fmt(h.stock.price * h.qty)}</span>
                <span className={`w-24 text-right text-sm tabular-nums ${profit > 0 ? 'text-red-500' : profit < 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                  {profit >= 0 ? '+' : ''}{fmt(profit)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 시장 */}
      <div className="bg-white rounded-3xl shadow p-5">
        <div className="flex gap-2 mb-3">
          {[['ALL', '전체'], ['KR', '🇰🇷 한국'], ['US', '🇺🇸 미국']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMarket(id)}
              className={`px-3 py-1 rounded-xl text-sm ${market === id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
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
              <span>{s.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
              <span className="flex-1">{s.name}</span>
              <Spark data={s.history} up={pct >= 0} />
              <span className="w-24 text-right tabular-nums">{fmt(s.price)}</span>
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

      {/* 매매 모달 */}
      {sel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSel(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl mb-1">{sel.market === 'KR' ? '🇰🇷' : '🇺🇸'} {sel.name}</h3>
            <div className="text-3xl text-blue-600 tabular-nums mb-1">{fmt(sel.price)} {klass.currency}</div>
            <div className="text-sm text-gray-400 mb-4">
              보유: {(student.holdings?.[sel.id]?.qty || 0)}주 · 내 현금: {fmt(student.cash)} {klass.currency}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-xl bg-gray-100 text-xl">−</button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="flex-1 text-center rounded-xl border-2 border-gray-200 py-2 text-xl outline-none"
              />
              <button onClick={() => setQty(Number(qty) + 1)} className="w-10 h-10 rounded-xl bg-gray-100 text-xl">+</button>
            </div>
            <div className="text-center text-gray-500 mb-4 tabular-nums">
              총 {fmt(sel.price * Math.max(1, Math.floor(Number(qty) || 1)))} {klass.currency}
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
