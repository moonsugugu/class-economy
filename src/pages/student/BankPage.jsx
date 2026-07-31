import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, query, where, onSnapshot,
  addDoc, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { MARKET_PATH, DEFAULT_FX } from '../../lib/stocks';
import {
  fmt, WEEK_MS, DAY_MS, SAVINGS_TERMS, savingsRateFor, savingsPayout,
} from '../../lib/util';

export default function BankPage() {
  const { klass, student } = useOutletContext();
  const [fx, setFx] = useState(DEFAULT_FX);
  const [exAmount, setExAmount] = useState('');
  const [exDir, setExDir] = useState('buy'); // buy=달러 사기, sell=달러 팔기
  const [amount, setAmount] = useState('');
  const [savAmount, setSavAmount] = useState('');
  const [savDays, setSavDays] = useState(14);
  const [accounts, setAccounts] = useState([]);
  const [msg, setMsg] = useState(null);

  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);

  useEffect(() => {
    const q = query(
      collection(db, 'classes', klass.id, 'accounts'),
      where('studentId', '==', student.id)
    );
    return onSnapshot(q, (snap) =>
      setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.startAt - a.startAt))
    );
  }, [klass.id, student.id]);

  // 환율은 시장 문서에서 실시간으로 받아와요
  useEffect(() => {
    return onSnapshot(doc(db, ...MARKET_PATH(klass.id)), (snap) => {
      if (snap.exists()) setFx(snap.data().fx || DEFAULT_FX);
    });
  }, [klass.id]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  /* ----- 💱 환전소: 학급 화폐 ↔ 달러 ----- */
  const exchange = async () => {
    const v = Math.floor(Number(exAmount));
    if (!v || v < 1) return flash('err', '바꿀 금액을 입력해 주세요.');
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        if (exDir === 'buy') {
          const cost = v * fx;                    // v달러를 사려면 필요한 학급 화폐
          if ((s.cash || 0) < cost) throw new Error('현금이 부족해요!');
          tx.update(studentRef, { cash: s.cash - cost, usd: (s.usd || 0) + v });
        } else {
          if ((s.usd || 0) < v) throw new Error('달러가 부족해요!');
          tx.update(studentRef, { usd: (s.usd || 0) - v, cash: (s.cash || 0) + v * fx });
        }
      });
      flash('ok', exDir === 'buy'
        ? `💲 ${fmt(v)}달러로 바꿨어요! 이제 미국 주식을 살 수 있어요.`
        : `💵 ${fmt(v * fx)} ${klass.currency}로 바꿨어요!`);
      setExAmount('');
    } catch (e) {
      flash('err', e.message);
    }
  };

  /* ----- 예금: 자유 입출금 + 주 단위 이자 ----- */
  const move = async (dir) => {
    const amt = Math.abs(Number(amount));
    if (!amt) return flash('err', '금액을 입력해 주세요.');
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        if (dir > 0) {
          if (s.cash < amt) throw new Error('현금이 부족해요.');
          tx.update(studentRef, {
            cash: s.cash - amt,
            deposit: s.deposit + amt,
            // 첫 입금이면 이자 시계를 지금부터 시작
            ...(s.deposit === 0 ? { depositLastAt: Date.now() } : {}),
          });
        } else {
          if (s.deposit < amt) throw new Error('예금이 부족해요.');
          tx.update(studentRef, { cash: s.cash + amt, deposit: s.deposit - amt });
        }
      });
      setAmount('');
      flash('ok', dir > 0 ? '🏦 입금 완료!' : '💵 출금 완료!');
    } catch (e) {
      flash('err', e.message);
    }
  };

  const weeks = student.deposit > 0
    ? Math.floor((Date.now() - (student.depositLastAt || Date.now())) / WEEK_MS)
    : 0;
  const pendingInterest = Math.floor(student.deposit * (klass.depositRate / 100) * weeks);

  const claimInterest = async () => {
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const w = Math.floor((Date.now() - (s.depositLastAt || Date.now())) / WEEK_MS);
        const interest = Math.floor(s.deposit * (klass.depositRate / 100) * w);
        if (w < 1 || interest < 1) throw new Error('아직 이자가 쌓이지 않았어요. 7일마다 이자가 생겨요!');
        tx.update(studentRef, {
          deposit: s.deposit + interest,
          depositLastAt: (s.depositLastAt || Date.now()) + w * WEEK_MS,
        });
      });
      flash('ok', '💸 이자를 받았어요!');
    } catch (e) {
      flash('err', e.message);
    }
  };

  /* ----- 적금: 기간 약정 + 높은 이율 ----- */
  const openSavings = async () => {
    const amt = Math.abs(Number(savAmount));
    if (!amt) return flash('err', '적금 금액을 입력해 주세요.');
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        if (s.cash < amt) throw new Error('현금이 부족해요.');
        tx.update(studentRef, { cash: s.cash - amt });
      });
      await addDoc(collection(db, 'classes', klass.id, 'accounts'), {
        studentId: student.id,
        type: 'savings',
        amount: amt,
        rate: savingsRateFor(klass.savingsRate, savDays), // 기간이 길수록 높은 이율로 고정
        days: Number(savDays),
        startAt: Date.now(),
        status: 'active',
        createdAt: serverTimestamp(),
      });
      setSavAmount('');
      flash('ok', `🐷 ${savDays}일 적금 가입 완료!`);
    } catch (e) {
      flash('err', e.message);
    }
  };

  const payout = (a) => savingsPayout(a.amount, a.rate, a.days);

  const closeSavings = async (a, mature) => {
    const back = mature ? payout(a) : a.amount;
    if (!mature && !confirm('중도 해지하면 이자 없이 원금만 돌려받아요. 해지할까요?')) return;
    try {
      await runTransaction(db, async (tx) => {
        const accRef = doc(db, 'classes', klass.id, 'accounts', a.id);
        const acc = (await tx.get(accRef)).data();
        if (acc.status !== 'active') throw new Error('이미 처리된 적금이에요.');
        const s = (await tx.get(studentRef)).data();
        tx.update(accRef, { status: mature ? 'paid' : 'canceled' });
        tx.update(studentRef, { cash: s.cash + back });
      });
      flash('ok', mature ? `🎉 만기! ${fmt(back)}${klass.currency}를 받았어요!` : '원금을 돌려받았어요.');
    } catch (e) {
      flash('err', e.message);
    }
  };

  const active = accounts.filter((a) => a.status === 'active');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-emerald-600">🏦 우리 반 은행</h2>
      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {/* 예금 */}
      <div className="bg-white rounded-3xl shadow p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl">💵 예금 통장 <span className="text-sm text-gray-400">(주 {klass.depositRate}% 이자)</span></h3>
          <div className="text-2xl text-emerald-600 tabular-nums">{fmt(student.deposit)} {klass.currency}</div>
        </div>
        <p className="text-xs text-gray-400 mb-3">언제든 넣고 뺄 수 있어요. 7일마다 이자가 쌓여요.</p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="금액"
            className="rounded-xl border-2 border-gray-200 px-3 py-2 w-32 focus:border-emerald-400 outline-none"
          />
          <button onClick={() => move(1)} className="rounded-xl px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white">입금</button>
          <button onClick={() => move(-1)} className="rounded-xl px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white">출금</button>
          <button
            onClick={claimInterest}
            className={`ml-auto rounded-xl px-4 py-2 text-white ${pendingInterest > 0 ? 'bg-amber-400 hover:bg-amber-500 animate-pulse' : 'bg-gray-300'}`}
          >
            💸 이자 받기{pendingInterest > 0 ? ` (+${fmt(pendingInterest)})` : ''}
          </button>
        </div>
      </div>

      {/* 💱 환율 거래소 */}
      <div className="bg-white rounded-3xl shadow p-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h3 className="text-xl">💱 환율 거래소</h3>
          <div className="text-lg text-emerald-600 tabular-nums">
            1 달러 = {fmt(fx)} {klass.currency}
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          미국 주식은 <b>달러</b>로만 살 수 있어요. 환율은 아침·오후에 조금씩 바뀌니 쌀 때 바꾸면 이득! 💡
        </p>
        <div className="flex gap-2 mb-3">
          {[['buy', '💲 달러 사기'], ['sell', '💵 달러 팔기']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setExDir(id); setExAmount(''); }}
              className={`flex-1 rounded-xl py-2 transition ${
                exDir === id ? 'bg-emerald-500 text-white shadow' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="number"
            value={exAmount}
            onChange={(e) => setExAmount(e.target.value)}
            placeholder={exDir === 'buy' ? '살 달러(개수)' : '팔 달러(개수)'}
            className="rounded-xl border-2 border-gray-200 px-3 py-2 w-36 focus:border-emerald-400 outline-none"
          />
          <span className="text-gray-400">달러</span>
          <button onClick={exchange} className="rounded-xl px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white">
            바꾸기
          </button>
          <span className="ml-auto text-sm text-gray-500">
            내 달러 <b className="text-emerald-600">${fmt(student.usd || 0)}</b>
          </span>
        </div>
        {Number(exAmount) > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {exDir === 'buy'
              ? <>💵 {fmt(Math.floor(Number(exAmount)) * fx)} {klass.currency} → 💲 {fmt(Math.floor(Number(exAmount)))}달러</>
              : <>💲 {fmt(Math.floor(Number(exAmount)))}달러 → 💵 {fmt(Math.floor(Number(exAmount)) * fx)} {klass.currency}</>}
          </p>
        )}
      </div>

      {/* 적금 가입 */}
      <div className="bg-white rounded-3xl shadow p-6">
        <h3 className="text-xl mb-1">🐷 적금 가입 <span className="text-sm text-gray-400">(오래 맡길수록 이율 UP!)</span></h3>
        <p className="text-xs text-gray-400 mb-3">
          기간이 한 주 늘어날 때마다 이율이 1%p씩 높아져요. 중간에 해지하면 이자 없이 원금만 돌려받아요!
        </p>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="number"
            value={savAmount}
            onChange={(e) => setSavAmount(e.target.value)}
            placeholder="금액"
            className="rounded-xl border-2 border-gray-200 px-3 py-2 w-32 focus:border-pink-400 outline-none"
          />
          <button onClick={openSavings} className="rounded-xl px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white">가입하기</button>
        </div>

        {/* 기간 선택 — 오래 맡길수록 이율이 높아져요 */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {SAVINGS_TERMS.map((d) => {
            const r = savingsRateFor(klass.savingsRate, d);
            const on = Number(savDays) === d;
            const amt = Number(savAmount) || 0;
            return (
              <button
                key={d}
                onClick={() => setSavDays(d)}
                className={`rounded-2xl border-2 p-3 text-center transition ${
                  on ? 'border-pink-500 bg-pink-50 scale-105' : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                <div className="text-lg">{d}일</div>
                <div className="text-pink-500">주 {r}%</div>
                {amt > 0 && (
                  <div className="text-[11px] text-gray-400 tabular-nums">
                    → {fmt(savingsPayout(amt, r, d))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {Number(savAmount) > 0 && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            {savDays}일 뒤에 <b className="text-pink-600">
              {fmt(savingsPayout(Number(savAmount), savingsRateFor(klass.savingsRate, savDays), savDays))} {klass.currency}
            </b>
            를 받아요! (이자 +{fmt(savingsPayout(Number(savAmount), savingsRateFor(klass.savingsRate, savDays), savDays) - Number(savAmount))})
          </p>
        )}
      </div>

      {/* 내 적금 목록 */}
      {active.length > 0 && (
        <div className="bg-white rounded-3xl shadow p-6 space-y-3">
          <h3 className="text-xl">내 적금</h3>
          {active.map((a) => {
            const end = a.startAt + a.days * DAY_MS;
            const mature = Date.now() >= end;
            const leftDays = Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
            const progress = Math.min(100, ((Date.now() - a.startAt) / (a.days * DAY_MS)) * 100);
            return (
              <div key={a.id} className="border-2 border-pink-100 rounded-2xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1">
                    <b>{fmt(a.amount)} {klass.currency}</b> · {a.days}일 적금
                    <span className="text-sm text-gray-400 ml-2">
                      {mature ? '만기 도착! 🎉' : `만기까지 ${leftDays}일`}
                    </span>
                  </div>
                  {mature ? (
                    <button onClick={() => closeSavings(a, true)} className="rounded-xl px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white animate-pulse">
                      🎉 {fmt(payout(a))} 받기
                    </button>
                  ) : (
                    <button onClick={() => closeSavings(a, false)} className="rounded-xl px-3 py-1 text-sm text-gray-400 border border-gray-200">
                      중도 해지
                    </button>
                  )}
                </div>
                <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-pink-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
