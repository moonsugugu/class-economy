import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, query, where, onSnapshot,
  addDoc, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { MARKET_PATH, DEFAULT_FX, DEFAULT_KRW_PER_UNIT } from '../../lib/stocks';
import {
  fmt, WEEK_MS, DAY_MS, SAVINGS_TERMS, savingsRateFor, savingsPayout, netAssets,
} from '../../lib/util';
import {
  depositRateFor, withdrawalFeeFor, savingsSignupBonusFor,
} from '../../lib/economyEvents.js';
import {
  BANKRUPTCY_GRANT, DEFAULT_LOAN_LIMIT, loanDueAmount, loanInterestRate, loanIsDue,
  loanLimitFor, loanRateFor, LOAN_TERM_MS,
} from '../../lib/loans.js';

export default function BankPage() {
  const { klass, student } = useOutletContext();
  const [fx, setFx] = useState(DEFAULT_FX);
  const [exAmount, setExAmount] = useState('');
  const [exDir, setExDir] = useState('buy'); // buy=사기, sell=팔기
  const [exCur, setExCur] = useState('KRW'); // KRW=원, USD=달러
  const [amount, setAmount] = useState('');
  const [savAmount, setSavAmount] = useState('');
  const [savDays, setSavDays] = useState(14);
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [market, setMarket] = useState(null);
  const [loanAmount, setLoanAmount] = useState('');
  const [msg, setMsg] = useState(null);
  const [clock, setClock] = useState(Date.now());

  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'classes', klass.id, 'accounts'),
      where('studentId', '==', student.id)
    );
    return onSnapshot(q, (snap) =>
      setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.startAt - a.startAt))
    );
  }, [klass.id, student.id]);

  useEffect(() => {
    const q = query(
      collection(db, 'classes', klass.id, 'loans'),
      where('studentId', '==', student.id)
    );
    return onSnapshot(q, (snap) =>
      setLoans(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.borrowedAt || 0) - (a.borrowedAt || 0)))
    );
  }, [klass.id, student.id]);

  // 환율은 시장 문서에서 실시간으로 받아와요
  useEffect(() => {
    return onSnapshot(doc(db, ...MARKET_PATH(klass.id)), (snap) => {
      if (snap.exists()) {
        setMarket(snap.data());
        setFx(snap.data().fx || DEFAULT_FX);
      }
    });
  }, [klass.id]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  /* ----- 💱 환전소: 학급화폐 ↔ 원(₩) / 달러($) ----- */
  const kpu = Number(klass.krwPerUnit) || DEFAULT_KRW_PER_UNIT; // 학급화폐 1개 = 몇 원
  const classUsdRate = kpu / (Number(fx) || DEFAULT_FX);
  const fmtRate = (value) => Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  const depositRate = depositRateFor(klass);
  const withdrawalFee = withdrawalFeeFor(klass);
  const savingsSignupBonus = savingsSignupBonusFor(klass);
  const currentLoans = loans.filter((loan) => ['active', 'overdue'].includes(loan.status));
  const loanLimit = loanLimitFor(klass) || DEFAULT_LOAN_LIMIT;
  const loanedPrincipal = currentLoans.reduce((total, loan) => total + (Number(loan.principal) || 0), 0);
  const availableLoan = Math.max(0, loanLimit - loanedPrincipal);
  const studentNetAssets = netAssets(
    student,
    market?.stocks || [],
    fx,
    kpu,
    accounts.filter((account) => account.status === 'active'),
    loans
  );
  // 학급화폐 1개로 살 수 있는 양
  const rate = exCur === 'KRW' ? kpu : kpu / fx;   // 원: kpu원, 달러: kpu/fx달러
  const unitCost = (v) => (exCur === 'KRW' ? v / kpu : (v * fx) / kpu); // v를 사는 데 드는 학급화폐

  const exchange = async () => {
    const v = exCur === 'KRW' ? Math.floor(Number(exAmount)) : Math.floor(Number(exAmount));
    if (!v || v < 1) return flash('err', '바꿀 금액을 입력해 주세요.');
    const field = exCur === 'KRW' ? 'krw' : 'usd';
    const label = exCur === 'KRW' ? '원' : '달러';
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        if (exDir === 'buy') {
          const cost = Math.ceil(unitCost(v));
          if ((s.cash || 0) < cost) throw new Error(`${klass.currency}가 부족해요!`);
          tx.update(studentRef, { cash: s.cash - cost, [field]: (s[field] || 0) + v });
        } else {
          if ((s[field] || 0) < v) throw new Error(`${label}가 부족해요!`);
          tx.update(studentRef, {
            [field]: (s[field] || 0) - v,
            cash: (s.cash || 0) + Math.floor(unitCost(v)),
          });
        }
      });
      flash('ok', exDir === 'buy'
        ? `💱 ${fmt(v)}${label}로 바꿨어요! 이제 ${exCur === 'KRW' ? '한국' : '미국'} 주식을 살 수 있어요.`
        : `💵 ${fmt(Math.floor(unitCost(v)))} ${klass.currency}로 바꿨어요!`);
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
          if (withdrawalFee > amt) throw new Error(`출금 수수료 ${fmt(withdrawalFee)}보다 적은 금액은 출금할 수 없어요.`);
          tx.update(studentRef, { cash: s.cash + amt - withdrawalFee, deposit: s.deposit - amt });
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
  const pendingInterest = Math.floor(student.deposit * (depositRate / 100) * weeks);

  const claimInterest = async () => {
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const w = Math.floor((Date.now() - (s.depositLastAt || Date.now())) / WEEK_MS);
        const interest = Math.floor(s.deposit * (depositRate / 100) * w);
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
        tx.update(studentRef, { cash: s.cash - amt + savingsSignupBonus });
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

  const applyLoan = async () => {
    const amt = Math.floor(Math.abs(Number(loanAmount)));
    if (!amt) return flash('err', '대출 금액을 입력해 주세요.');
    if (amt > availableLoan) return flash('err', `현재 대출 가능 금액은 ${fmt(availableLoan)}${klass.currency}예요.`);
    const now = Date.now();
    const loanRef = doc(collection(db, 'classes', klass.id, 'loans'));
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data() || {};
        const classData = (await tx.get(doc(db, 'classes', klass.id))).data() || klass;
        const limit = loanLimitFor(classData);
        if (amt > Math.max(0, limit - loanedPrincipal)) throw new Error('대출 한도를 초과했어요.');
        tx.set(loanRef, {
          studentId: student.id,
          studentName: s.name || student.name,
          principal: amt,
          rate: loanRateFor(classData),
          borrowedAt: now,
          dueAt: now + LOAN_TERM_MS,
          status: 'active',
          createdAt: serverTimestamp(),
        });
        tx.update(studentRef, { cash: (Number(s.cash) || 0) + amt });
      });
      setLoanAmount('');
      flash('ok', `대출 ${fmt(amt)}${klass.currency}이 실행됐어요. 지금 갚아도 기본 이자율은 그대로 적용돼요.`);
    } catch (e) {
      flash('err', e.message);
    }
  };

  const repayLoan = async (loan) => {
    const due = loanDueAmount(loan, clock);
    if (!window.confirm(`${fmt(due)}${klass.currency}을 상환할까요?`)) return;
    try {
      await runTransaction(db, async (tx) => {
        const loanRef = doc(db, 'classes', klass.id, 'loans', loan.id);
        const latestLoan = (await tx.get(loanRef)).data() || {};
        const s = (await tx.get(studentRef)).data() || {};
        if (!['active', 'overdue'].includes(latestLoan.status)) throw new Error('이미 처리된 대출이에요.');
        const latestDue = loanDueAmount(latestLoan, Date.now());
        if ((Number(s.cash) || 0) < latestDue) throw new Error('현금이 부족해요.');
        tx.update(loanRef, { status: 'paid', paidAt: Date.now(), interest: latestDue - (Number(latestLoan.principal) || 0) });
        tx.update(studentRef, { cash: (Number(s.cash) || 0) - latestDue });
      });
      flash('ok', `대출 ${fmt(due)}${klass.currency}을 상환했어요.`);
    } catch (e) {
      flash('err', e.message);
    }
  };

  const requestBankruptcy = async () => {
    if (studentNetAssets >= 0) return flash('err', '순자산이 0보다 작을 때만 파산 신청할 수 있어요.');
    const status = student.bankruptcy?.status;
    if (['requested', 'mission', 'submitted'].includes(status)) return flash('err', '이미 진행 중인 파산 신청이 있어요.');
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data() || {};
        tx.update(studentRef, {
          bankruptcy: {
            status: 'requested',
            requestedAt: Date.now(),
            assetAtRequest: studentNetAssets,
          },
        });
      });
      flash('ok', '담임 선생님께 파산 신청을 보냈어요.');
    } catch (e) {
      flash('err', e.message);
    }
  };

  const submitVolunteer = async () => {
    if (student.bankruptcy?.status !== 'mission') return;
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data() || {};
        if (s.bankruptcy?.status !== 'mission') throw new Error('선생님이 먼저 봉사 미션을 승인해야 해요.');
        tx.update(studentRef, {
          bankruptcy: { ...s.bankruptcy, status: 'submitted', submittedAt: Date.now() },
        });
      });
      flash('ok', '봉사활동 완료를 제출했어요. 선생님 확인을 기다려 주세요.');
    } catch (e) {
      flash('err', e.message);
    }
  };

  const active = accounts.filter((a) => a.status === 'active');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-emerald-600">🏦 우리 반 은행</h2>
      <div className="bg-white rounded-3xl shadow p-6 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-xl text-indigo-700">💳 대출</h3>
          <span className="text-sm text-gray-500">주 이자 {fmt(loanRateFor(klass))}% · 한도 {fmt(loanLimit)} {klass.currency}</span>
        </div>
        <p className="text-xs text-gray-400">언제든 상환할 수 있고 기본 이자율은 그대로 적용돼요. 만기 후에는 연체 일수마다 이자율이 1%p씩 올라가요. 현재 가능 금액: <b className="text-indigo-600">{fmt(availableLoan)} {klass.currency}</b></p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="number"
            min="1"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            placeholder="빌릴 금액"
            className="rounded-xl border-2 border-gray-200 px-3 py-2 w-32 focus:border-indigo-400 outline-none"
          />
          <button onClick={applyLoan} className="rounded-xl px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white">대출받기</button>
        </div>
        {currentLoans.length > 0 && (
          <div className="space-y-2 pt-1">
            {currentLoans.map((loan) => {
              const due = loanDueAmount(loan, clock);
              const dueNow = loanIsDue(loan, clock);
              const currentRate = loanInterestRate(loan, clock);
              return (
                <div key={loan.id} className={`rounded-2xl border-2 p-3 ${dueNow ? 'border-rose-200 bg-rose-50' : 'border-indigo-100 bg-indigo-50/50'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex-1 text-sm">
                      <b>{fmt(loan.principal)} {klass.currency}</b> 대출 · 상환액 <b>{fmt(due)} {klass.currency}</b>
                      <div className="text-xs text-gray-500 mt-1">{dueNow ? `연체 이자율 ${fmt(currentRate)}%` : `미리 상환 가능 · ${new Date(loan.dueAt).toLocaleDateString('ko-KR')} 만기 · 이자율 ${fmt(currentRate)}%`}</div>
                    </div>
                    <button onClick={() => repayLoan(loan)} className="rounded-xl px-3 py-2 text-sm bg-rose-500 text-white">상환하기</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(studentNetAssets < 0 || student.bankruptcy?.status) && (
        <div className="rounded-3xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 shadow p-6 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xl text-rose-700">🧯 파산 신청·회생</h3>
            <span className="text-sm text-rose-600">현재 순자산 {fmt(studentNetAssets)} {klass.currency}</span>
          </div>
          {!student.bankruptcy?.status && <p className="text-sm text-rose-600">순자산이 마이너스예요. 담임 선생님께 파산 신청을 보내고 봉사활동으로 회생할 수 있어요.</p>}
          {student.bankruptcy?.status === 'requested' && <p className="text-sm text-amber-700">신청을 보냈어요. 담임 선생님이 봉사활동 미션을 승인할 때까지 기다려 주세요.</p>}
          {student.bankruptcy?.status === 'mission' && (
            <div className="rounded-2xl bg-white/80 p-4 space-y-2">
              <b className="text-rose-700">봉사 미션: 교실 정리와 교구 정돈</b>
              <p className="text-sm text-gray-600">선생님께 봉사활동을 확인받은 뒤 완료 제출을 눌러 주세요.</p>
              <button onClick={submitVolunteer} className="rounded-xl px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white">봉사 완료 제출</button>
            </div>
          )}
          {student.bankruptcy?.status === 'submitted' && <p className="text-sm text-amber-700">완료 제출을 보냈어요. 선생님 승인 후 기본금 {fmt(BANKRUPTCY_GRANT)}를 받아 회생합니다.</p>}
          {student.bankruptcy?.status === 'rehabilitated' && <p className="text-sm text-emerald-700">회생이 완료됐어요. 기본금 {fmt(BANKRUPTCY_GRANT)}를 받았습니다.</p>}
          {studentNetAssets < 0 && !['requested', 'mission', 'submitted'].includes(student.bankruptcy?.status) && (
            <button onClick={requestBankruptcy} className="rounded-xl px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white">담임 선생님께 파산 신청</button>
          )}
        </div>
      )}

      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {/* 예금 */}
      <div className="bg-white rounded-3xl shadow p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl">💵 예금 통장 <span className="text-sm text-gray-400">(주 {depositRate}% 이자)</span></h3>
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
          <h3 className="text-xl">💱 환전소</h3>
          <div className="text-sm text-emerald-600 tabular-nums text-right">
            <div>1 {klass.currency} = {fmt(kpu)} 원</div>
            <div>1 {klass.currency} = {fmtRate(classUsdRate)} 달러</div>
            <div className="text-gray-400">1 달러 = {fmt(fx)} 원</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          한국 주식은 <b>원(₩)</b>, 미국 주식은 <b>달러($)</b>로 사요. 여기서 미리 바꿔 두세요! 💡
        </p>

        {/* 어떤 돈으로 바꿀지 */}
        <div className="flex gap-2 mb-2">
          {[['KRW', '🇰🇷 원'], ['USD', '🇺🇸 달러']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setExCur(id); setExAmount(''); }}
              className={`flex-1 rounded-xl py-2 transition ${
                exCur === id ? 'bg-emerald-600 text-white shadow' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          {[['buy', '사기'], ['sell', '팔기']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setExDir(id); setExAmount(''); }}
              className={`flex-1 rounded-xl py-1.5 text-sm transition ${
                exDir === id ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' : 'bg-gray-50 text-gray-400'
              }`}
            >
              {exCur === 'KRW' ? '원' : '달러'} {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="number"
            value={exAmount}
            onChange={(e) => setExAmount(e.target.value)}
            placeholder={`${exDir === 'buy' ? '살' : '팔'} 금액`}
            className="rounded-xl border-2 border-gray-200 px-3 py-2 w-36 focus:border-emerald-400 outline-none"
          />
          <span className="text-gray-400">{exCur === 'KRW' ? '원' : '달러'}</span>
          <button onClick={exchange} className="rounded-xl px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white">
            바꾸기
          </button>
        </div>

        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-gray-500">내 지갑</span>
          <span className="text-amber-600">💵 {fmt(student.cash)} {klass.currency}</span>
          <span className="text-blue-600">🇰🇷 {fmt(student.krw || 0)}원</span>
          <span className="text-emerald-600">🇺🇸 ${fmt(student.usd || 0)}</span>
        </div>

        {Number(exAmount) > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {exDir === 'buy'
              ? <>💵 {fmt(Math.ceil(unitCost(Math.floor(Number(exAmount)))))} {klass.currency} → {exCur === 'KRW' ? '🇰🇷' : '🇺🇸'} {fmt(Math.floor(Number(exAmount)))}{exCur === 'KRW' ? '원' : '달러'}</>
              : <>{exCur === 'KRW' ? '🇰🇷' : '🇺🇸'} {fmt(Math.floor(Number(exAmount)))}{exCur === 'KRW' ? '원' : '달러'} → 💵 {fmt(Math.floor(unitCost(Math.floor(Number(exAmount)))))} {klass.currency}</>}
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
