import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, increment, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { lotterySettings, lotteryWeekKey } from '../../lib/lottery';

export default function LotteryPage() {
  const { klass, student } = useOutletContext();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const settings = lotterySettings(klass);
  const weekKey = lotteryWeekKey();
  const lottery = student.lottery || {};
  const purchasedThisWeek = lottery.weekKey === weekKey;
  const supportFund = Math.max(0, Math.floor(Number(klass.lotterySupportFund) || 0));

  const flash = (type, text) => {
    setMsg({ type, text });
    window.setTimeout(() => setMsg(null), 4500);
  };

  const buy = async () => {
    if (busy || purchasedThisWeek) return;
    if (student.cash < settings.price) return flash('err', '현금이 부족해요.');
    if (!window.confirm(`복권 1장을 ${fmt(settings.price)}${klass.currency}에 살까요?\n당첨 확률은 ${settings.probability}%예요.`)) return;
    setBusy(true);
    try {
      const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
      const classRef = doc(db, 'classes', klass.id);
      const ticketRef = doc(collection(db, 'classes', klass.id, 'lotteryTickets'));
      let won = false;
      let prize = 0;
      await runTransaction(db, async (tx) => {
        const [studentSnap, classSnap] = await Promise.all([tx.get(studentRef), tx.get(classRef)]);
        if (!studentSnap.exists()) throw new Error('학생 정보를 찾지 못했어요.');
        const currentStudent = studentSnap.data() || {};
        const currentClass = classSnap.exists() ? { ...klass, ...classSnap.data() } : klass;
        const liveSettings = lotterySettings(currentClass);
        const current = currentStudent.lottery && typeof currentStudent.lottery === 'object' ? currentStudent.lottery : {};
        if (current.weekKey === weekKey) throw new Error('이번 주 복권은 이미 샀어요. 다음 주에 다시 살 수 있어요!');
        if ((Number(currentStudent.cash) || 0) < liveSettings.price) throw new Error('현금이 부족해요.');
        won = Math.random() < liveSettings.probability / 100;
        prize = won ? liveSettings.prize : 0;
        const supportAmount = Math.floor(liveSettings.price * liveSettings.supportRate / 100);
        tx.update(studentRef, {
          cash: (Number(currentStudent.cash) || 0) - liveSettings.price + prize,
          lottery: {
            ...current,
            weekKey,
            lastAt: Date.now(),
            lastWon: won,
            lastPrize: prize,
            totalTickets: (Number(current.totalTickets) || 0) + 1,
            wins: (Number(current.wins) || 0) + (won ? 1 : 0),
          },
        });
        tx.update(classRef, {
          lotterySupportFund: increment(supportAmount),
          lotterySales: increment(liveSettings.price),
          lotteryTickets: increment(1),
          ...(won ? { lotteryWinnings: increment(prize) } : {}),
        });
        tx.set(ticketRef, {
          studentId: student.id,
          studentName: currentStudent.name || student.name,
          weekKey,
          price: liveSettings.price,
          supportAmount,
          won,
          prize,
          at: Date.now(),
          createdAt: serverTimestamp(),
        });
      });
      flash(won ? 'win' : 'ok', won
        ? `🎉 축하해요! ${fmt(prize)}${klass.currency}에 당첨됐어요!`
        : `아쉽지만 꽝이에요. 복권 금액의 ${settings.supportRate}%가 지원금으로 쌓였어요.`);
    } catch (error) {
      flash('err', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 p-6 text-white shadow-lg">
        <span className="absolute -right-3 -top-6 text-8xl opacity-20">🎟️</span>
        <div className="relative">
          <div className="text-sm text-white/75">행운을 모아 어려운 친구를 도와요</div>
          <h2 className="mt-1 text-3xl">🎟️ 학급 복권</h2>
          <p className="mt-2 text-sm text-white/80">일주일에 한 장만 살 수 있어요.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div className="rounded-2xl bg-white/15 p-3"><div className="text-xs text-white/70">복권 가격</div><b>{fmt(settings.price)}</b></div>
            <div className="rounded-2xl bg-white/15 p-3"><div className="text-xs text-white/70">당첨 확률</div><b>{settings.probability}%</b></div>
            <div className="rounded-2xl bg-white/15 p-3"><div className="text-xs text-white/70">당첨 보상</div><b>{fmt(settings.prize)}</b></div>
            <div className="rounded-2xl bg-white/15 p-3"><div className="text-xs text-white/70">지원금</div><b>{fmt(supportFund)}</b></div>
          </div>
        </div>
      </div>

      {msg && <div className={`rounded-2xl px-4 py-3 font-bold ${msg.type === 'win' ? 'bg-yellow-100 text-yellow-800' : msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</div>}

      <div className="rounded-3xl bg-white p-6 text-center shadow">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-yellow-200 to-fuchsia-200 text-6xl shadow-inner">🎫</div>
        <h3 className="mt-4 text-xl text-gray-700">이번 주 복권</h3>
        <p className="mt-1 text-sm text-gray-400">{purchasedThisWeek ? '이번 주 복권을 이미 구매했어요.' : `현재 현금 ${fmt(student.cash)}${klass.currency}`}</p>
        <button
          onClick={buy}
          disabled={busy || purchasedThisWeek || student.cash < settings.price}
          className="mt-5 rounded-2xl bg-fuchsia-500 px-8 py-3 text-lg font-bold text-white shadow hover:bg-fuchsia-600 disabled:bg-gray-300"
        >
          {busy ? '추첨 중...' : purchasedThisWeek ? '다음 주에 구매 가능' : `복권 구매하기 · ${fmt(settings.price)}${klass.currency}`}
        </button>
        <p className="mt-4 text-xs text-gray-400">판매 금액의 {settings.supportRate}%는 지원금으로 적립되어 순자산 하위 {settings.recipients}명에게 배부됩니다.</p>
      </div>

      {lottery.weekKey === weekKey && lottery.lastAt && (
        <div className={`rounded-3xl p-5 shadow ${lottery.lastWon ? 'bg-yellow-50 text-yellow-800' : 'bg-gray-50 text-gray-600'}`}>
          <b>최근 추첨 결과</b>
          <p className="mt-1">{lottery.lastWon ? `🎉 ${fmt(lottery.lastPrize || 0)}${klass.currency} 당첨!` : '아쉽지만 다음 주에 다시 도전해 보세요.'}</p>
        </div>
      )}
    </div>
  );
}
