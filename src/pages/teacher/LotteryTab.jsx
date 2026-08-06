import { useEffect, useMemo, useState } from 'react';
import {
  collection, doc, onSnapshot, orderBy, query, limit as qlimit, updateDoc, where,
  runTransaction, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt, netAssets } from '../../lib/util';
import { MARKET_PATH, DEFAULT_FX, DEFAULT_KRW_PER_UNIT } from '../../lib/stocks';
import { isActiveStudent } from '../../lib/studentState';
import {
  DEFAULT_LOTTERY_DISTRIBUTION_RATE,
  DEFAULT_LOTTERY_PRIZE,
  DEFAULT_LOTTERY_PRICE,
  DEFAULT_LOTTERY_RECIPIENTS,
  DEFAULT_LOTTERY_SUPPORT_RATE,
  DEFAULT_LOTTERY_WIN_PROBABILITY,
  lotterySettings,
} from '../../lib/lottery';

const card = 'rounded-3xl bg-white p-6 shadow';
const input = 'rounded-xl border-2 border-gray-200 px-3 py-2 outline-none focus:border-fuchsia-400';

export default function LotteryTab({ klass }) {
  const [students, setStudents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [market, setMarket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    price: DEFAULT_LOTTERY_PRICE,
    probability: DEFAULT_LOTTERY_WIN_PROBABILITY,
    prize: DEFAULT_LOTTERY_PRIZE,
    supportRate: DEFAULT_LOTTERY_SUPPORT_RATE,
    recipients: DEFAULT_LOTTERY_RECIPIENTS,
    distributionRate: DEFAULT_LOTTERY_DISTRIBUTION_RATE,
  });

  useEffect(() => {
    return onSnapshot(collection(db, 'classes', klass.id, 'students'), (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'accounts'), where('status', '==', 'active'));
    return onSnapshot(q, (snap) => setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  useEffect(() => {
    return onSnapshot(collection(db, 'classes', klass.id, 'loans'), (snap) => {
      setLoans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [klass.id]);

  useEffect(() => {
    return onSnapshot(doc(db, ...MARKET_PATH(klass.id)), (snap) => setMarket(snap.exists() ? snap.data() : null));
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'lotteryTickets'), orderBy('at', 'desc'), qlimit(20));
    return onSnapshot(q, (snap) => setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  useEffect(() => {
    const settings = lotterySettings(klass);
    setForm({
      price: settings.price,
      probability: settings.probability,
      prize: settings.prize,
      supportRate: settings.supportRate,
      recipients: settings.recipients,
      distributionRate: settings.distributionRate,
    });
  }, [klass.id]);

  const activeStudents = useMemo(() => students.filter(isActiveStudent), [students]);
  const settings = lotterySettings({
    lotteryPrice: form.price,
    lotteryWinProbability: form.probability,
    lotteryPrize: form.prize,
    lotterySupportRate: form.supportRate,
    lotterySupportRecipients: form.recipients,
    lotteryDistributionRate: form.distributionRate,
  });
  const fx = Number(market?.fx) || DEFAULT_FX;
  const kpu = Number(klass.krwPerUnit) || DEFAULT_KRW_PER_UNIT;
  const rankedStudents = useMemo(() => activeStudents
    .map((student) => ({
      ...student,
      assets: netAssets(
        student,
        market?.stocks || [],
        fx,
        kpu,
        accounts.filter((account) => account.studentId === student.id),
        loans.filter((loan) => loan.studentId === student.id),
      ),
    }))
    .sort((a, b) => a.assets - b.assets || String(a.name || '').localeCompare(String(b.name || ''), 'ko-KR')),
  [activeStudents, accounts, fx, kpu, loans, market?.stocks]);
  const recipientPreview = rankedStudents.slice(0, Math.min(settings.recipients, rankedStudents.length));
  const supportFund = Math.max(0, Math.floor(Number(klass.lotterySupportFund) || 0));
  const plannedAmount = Math.floor(supportFund * settings.distributionRate / 100);
  const totalTickets = Number(klass.lotteryTickets) || tickets.length;
  const totalSales = Number(klass.lotterySales) || tickets.reduce((sum, ticket) => sum + (Number(ticket.price) || 0), 0);
  const totalWinners = tickets.filter((ticket) => ticket.won).length;

  const flash = (text) => {
    setMsg(text);
    window.setTimeout(() => setMsg(''), 4000);
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    const next = lotterySettings({
      lotteryPrice: form.price,
      lotteryWinProbability: form.probability,
      lotteryPrize: form.prize,
      lotterySupportRate: form.supportRate,
      lotterySupportRecipients: form.recipients,
      lotteryDistributionRate: form.distributionRate,
    });
    await updateDoc(doc(db, 'classes', klass.id), {
      lotteryPrice: next.price,
      lotteryWinProbability: next.probability,
      lotteryPrize: next.prize,
      lotterySupportRate: next.supportRate,
      lotterySupportRecipients: next.recipients,
      lotteryDistributionRate: next.distributionRate,
    });
    setForm(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const distribute = async () => {
    if (busy) return;
    if (!recipientPreview.length) return flash('활성 학생이 아직 없어요.');
    if (!supportFund) return flash('아직 쌓인 지원금이 없어요.');
    if (!window.confirm(`지원금 ${fmt(plannedAmount)}${klass.currency}를 순자산 하위 ${recipientPreview.length}명에게 배부할까요?`)) return;
    setBusy(true);
    try {
      const classRef = doc(db, 'classes', klass.id);
      const logRef = doc(collection(db, 'classes', klass.id, 'lotterySupportLogs'));
      let paid = 0;
      let recipients = [];
      await runTransaction(db, async (tx) => {
        const classSnap = await tx.get(classRef);
        const currentClass = classSnap.exists() ? classSnap.data() : {};
        const fund = Math.max(0, Math.floor(Number(currentClass.lotterySupportFund) || 0));
        const liveSettings = lotterySettings(currentClass);
        const amount = Math.floor(fund * liveSettings.distributionRate / 100);
        const ids = recipientPreview.map((student) => student.id);
        const studentSnaps = await Promise.all(ids.map((id) => tx.get(doc(db, 'classes', klass.id, 'students', id))));
        recipients = studentSnaps.map((snap, index) => ({ snap, id: ids[index] })).filter(({ snap }) => snap.exists() && isActiveStudent(snap.data()));
        if (!recipients.length) throw new Error('배부할 활성 학생을 찾지 못했어요.');
        if (!amount) throw new Error('배부할 지원금이 1 이상이어야 해요.');
        const base = Math.floor(amount / recipients.length);
        const remainder = amount - base * recipients.length;
        recipients.forEach(({ id }, index) => {
          const share = base + (index < remainder ? 1 : 0);
          if (share > 0) tx.update(doc(db, 'classes', klass.id, 'students', id), { cash: increment(share) });
          paid += share;
        });
        tx.update(classRef, { lotterySupportFund: increment(-paid), lotterySupportDistributed: increment(paid) });
        tx.set(logRef, {
          type: 'lottery-support-distribution',
          amount: paid,
          recipientIds: recipients.map(({ id }) => id),
          recipientNames: recipients.map(({ snap }) => snap.data()?.name || '학생'),
          at: Date.now(),
          createdAt: serverTimestamp(),
        });
      });
      flash(`🎁 ${fmt(paid)}${klass.currency}를 하위 ${recipients.length}명에게 배부했어요.`);
    } catch (error) {
      flash(`지원금 배부 실패: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1"><div className="text-white/75">학생 복권 운영</div><h2 className="text-3xl">🎟️ 복권</h2></div>
          <div className="text-right"><div className="text-sm text-white/70">현재 지원금</div><div className="text-3xl font-bold">{fmt(supportFund)} <span className="text-base">{klass.currency}</span></div></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-xs text-white/70">판매 복권</div><b>{fmt(totalTickets)}장</b></div>
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-xs text-white/70">판매액</div><b>{fmt(totalSales)}</b></div>
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-xs text-white/70">최근 당첨</div><b>{totalWinners}명</b></div>
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-xs text-white/70">이번 배부 예정</div><b>{fmt(plannedAmount)}</b></div>
        </div>
      </div>

      <form onSubmit={saveSettings} className={`${card} space-y-4`}>
        <div><h3 className="text-xl text-fuchsia-700">복권 설정</h3><p className="mt-1 text-xs text-gray-400">확률은 퍼센트 단위입니다. 기본 0.01%는 1만 장 중 1장 정도의 확률이에요.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm text-gray-500">복권 가격<input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={`${input} mt-1 w-full`} /></label>
          <label className="text-sm text-gray-500">당첨 확률 (%)<input type="number" min="0" max="100" step="0.001" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} className={`${input} mt-1 w-full`} /></label>
          <label className="text-sm text-gray-500">당첨 보상금<input type="number" min="0" value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} className={`${input} mt-1 w-full`} /></label>
          <label className="text-sm text-gray-500">지원금 적립률 (%)<input type="number" min="0" max="100" value={form.supportRate} onChange={(e) => setForm({ ...form, supportRate: e.target.value })} className={`${input} mt-1 w-full`} /></label>
          <label className="text-sm text-gray-500">지원금 받을 학생 수<input type="number" min="1" max="100" value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} className={`${input} mt-1 w-full`} /></label>
          <label className="text-sm text-gray-500">배부할 지원금 비율 (%)<input type="number" min="0" max="100" value={form.distributionRate} onChange={(e) => setForm({ ...form, distributionRate: e.target.value })} className={`${input} mt-1 w-full`} /></label>
        </div>
        <button className="w-full rounded-2xl bg-indigo-500 py-3 text-lg font-bold text-white shadow hover:bg-indigo-600">설정 저장하기</button>
        {saved && <p className="text-center text-emerald-600">✅ 저장되었어요!</p>}
      </form>

      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1"><h3 className="text-xl text-emerald-700">🎁 지원금 배부</h3><p className="mt-1 text-sm text-gray-500">순자산이 적은 학생부터 {settings.recipients}명에게 균등하게 나눠 줍니다.</p></div>
          <button onClick={distribute} disabled={busy || !plannedAmount} className="rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-white shadow hover:bg-emerald-600 disabled:opacity-40">{busy ? '배부 중...' : `지원금 배부하기 · ${fmt(plannedAmount)}`}</button>
        </div>
        <div className="mt-4 space-y-2">
          {recipientPreview.map((student, index) => (
            <div key={student.id} className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm">
              <span className="w-6 text-center font-bold text-emerald-600">{index + 1}</span>
              <span className="flex-1">{student.name}</span>
              <span className="text-gray-500">순자산 {fmt(student.assets)}</span>
            </div>
          ))}
          {!recipientPreview.length && <p className="py-5 text-center text-gray-400">학생이 들어오면 하위 순위가 표시돼요.</p>}
        </div>
      </section>

      <section className={card}>
        <h3 className="mb-3 text-xl text-gray-700">최근 복권 판매 내역</h3>
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-3 py-2 text-sm">
              <span>{ticket.won ? '🎉' : '🎟️'}</span><span className="flex-1">{ticket.studentName}</span><span>{ticket.won ? `당첨 ${fmt(ticket.prize)}` : '꽝'}</span><span className="text-xs text-gray-400">지원금 +{fmt(ticket.supportAmount || 0)}</span>
            </div>
          ))}
          {!tickets.length && <p className="py-5 text-center text-gray-400">아직 판매된 복권이 없어요.</p>}
        </div>
      </section>
    </div>
  );
}
