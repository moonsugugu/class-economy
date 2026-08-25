import { useState } from 'react';
import {
  collection, doc, getDoc, getDocs, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { advance, MARKET_PATH, mergeSeedStocks } from '../../lib/stocks';
import {
  ECONOMY_EVENTS,
  activeEconomyEvents,
  eventEffectSummary,
} from '../../lib/economyEvents.js';
import { isActiveStudent } from '../../lib/studentState';

const categoryOrder = ['지원금', '농업·물가', '은행·금리', '주식시장', '세금·물가', '정책', '학급 특별'];

export default function EconomyEventsPanel({ klass }) {
  const [selectedId, setSelectedId] = useState(ECONOMY_EVENTS[0].id);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const currentEvents = activeEconomyEvents(klass);
  const selected = ECONOMY_EVENTS.find((item) => item.id === selectedId) || ECONOMY_EVENTS[0];
  const pendingMultiplier = Number(klass.eventNextMultiplier);
  const selectedIsActive = currentEvents.some((event) => event.id === selected.id);

  const flash = (text) => {
    setMsg(text);
    window.setTimeout(() => setMsg(''), 3500);
  };

  const trigger = async () => {
    if (busy) return;
    if (currentEvents.length >= 3) {
      flash('경제 이벤트는 동시에 최대 3개까지 발동할 수 있습니다.');
      return;
    }
    if (selectedIsActive) {
      flash('이미 발동 중인 이벤트입니다. 다른 이벤트를 선택해 주세요.');
      return;
    }
    const previewMultiplier = pendingMultiplier > 0 && !selected.effects.nextMultiplier ? pendingMultiplier : 1;
    const suffix = previewMultiplier > 1 ? ` 다음 이벤트 효과 ${previewMultiplier}배` : '';
    if (!window.confirm(`${selected.title}을(를) 발동할까요?${suffix}`)) return;
    setBusy(true);
    try {
      const classRef = doc(db, 'classes', klass.id);
      const [studentSnap, marketSnap, classSnap] = await Promise.all([
        getDocs(collection(db, 'classes', klass.id, 'students')),
        getDoc(doc(db, ...MARKET_PATH(klass.id))),
        getDoc(classRef),
      ]);
      const latestClass = classSnap.exists() ? { ...klass, ...classSnap.data() } : klass;
      const liveEvents = activeEconomyEvents(latestClass);
      if (liveEvents.length >= 3) throw new Error('다른 선생님 화면에서 이미 이벤트 3개가 발동되었습니다. 새로고침 후 다시 시도해 주세요.');
      if (liveEvents.some((event) => event.id === selected.id)) throw new Error('이미 발동 중인 이벤트입니다.');

      const livePendingMultiplier = Number(latestClass.eventNextMultiplier);
      const multiplier = livePendingMultiplier > 0 && !selected.effects.nextMultiplier ? livePendingMultiplier : 1;
      const batch = writeBatch(db);
      const effects = selected.effects || {};
      const cashDelta = Number(effects.cashDelta || 0) * multiplier;
      const depositHolderDelta = Number(effects.depositHolderDelta || 0) * multiplier;
      let changedStudents = 0;
      studentSnap.docs.forEach((snapshot) => {
        const student = { id: snapshot.id, ...snapshot.data() };
        if (!isActiveStudent(student)) return;
        const delta = cashDelta + (Number(student.deposit) > 0 ? depositHolderDelta : 0);
        if (!delta) return;
        batch.update(doc(db, 'classes', klass.id, 'students', snapshot.id), {
          cash: (Number(student.cash) || 0) + Math.floor(delta),
        });
        changedStudents += 1;
      });

      if (marketSnap.exists() && Array.isArray(marketSnap.data()?.stocks)) {
        const market = marketSnap.data();
        const stocks = mergeSeedStocks(market.stocks).map((stock) => {
          const symbol = stock.symbol || stock.id;
          const globalPct = Number(effects.stockChangePct) || 0;
          const targetPct = Array.isArray(effects.stockSymbols) && effects.stockSymbols.includes(symbol)
            ? Number(effects.targetStockChangePct) || 0
            : 0;
          const pct = (globalPct + targetPct) * multiplier;
          return pct ? advance(stock, Number(stock.price) * (1 + pct / 100)) : stock;
        });
        batch.update(doc(db, ...MARKET_PATH(klass.id)), { stocks, updatedAt: Date.now() });
      }

      const storedEvent = {
        id: selected.id,
        category: selected.category,
        title: selected.title,
        description: selected.description,
        effects,
        multiplier,
        at: Date.now(),
      };
      const nextEvents = [...liveEvents, storedEvent];
      const nextMultiplier = Number(effects.nextMultiplier) > 0 ? Number(effects.nextMultiplier) : 0;
      batch.update(classRef, {
        economyEvents: nextEvents,
        // 기존 단일 필드를 함께 기록해 이전 화면과 데이터 리더도 계속 동작하게 합니다.
        economyEvent: nextEvents[0] || null,
        eventNextMultiplier: nextMultiplier,
        updatedAt: Date.now(),
      });
      await batch.commit();
      const stockHint = (Number(effects.stockChangePct) || Number(effects.targetStockChangePct)) ? ' 주식 시세에도 효과가 반영되었습니다.' : '';
      flash(`${selected.title} 발동 완료! ${changedStudents ? `${changedStudents}명에게 금액 효과를 적용했습니다.` : ''}${stockHint}`);
    } catch (error) {
      flash(`이벤트 발동 실패: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const clear = async (eventId) => {
    if (busy || !window.confirm('이 이벤트를 종료할까요? 이미 적용된 지급·시세 변화는 되돌리지 않습니다.')) return;
    setBusy(true);
    try {
      const classRef = doc(db, 'classes', klass.id);
      const classSnap = await getDoc(classRef);
      const latestClass = classSnap.exists() ? { ...klass, ...classSnap.data() } : klass;
      const remaining = activeEconomyEvents(latestClass).filter((event) => event.id !== eventId);
      await updateDoc(classRef, {
        economyEvents: remaining,
        economyEvent: remaining[0] || null,
        eventNextMultiplier: Number(latestClass.eventNextMultiplier) || 0,
        updatedAt: Date.now(),
      });
      flash('경제 이벤트를 종료했습니다.');
    } catch (error) {
      flash(`종료 실패: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl shadow p-6 space-y-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1">
          <h3 className="text-xl text-amber-700">경제 이벤트 발동</h3>
          <p className="text-sm text-gray-500 mt-1">발동한 이벤트는 학생 화면 맨 위 전광판에 효과 내용과 함께 표시됩니다. 동시에 최대 3개까지 유지할 수 있습니다.</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-sm font-bold">현재 이벤트 {currentEvents.length}/3</span>
          {pendingMultiplier > 0 && <span className="rounded-full bg-fuchsia-100 text-fuchsia-700 px-3 py-1 text-sm font-bold">다음 이벤트 {pendingMultiplier}배</span>}
        </div>
      </div>

      {currentEvents.length > 0 && (
        <div className="space-y-2">
          {currentEvents.map((event) => (
            <div key={`${event.id}-${event.at || ''}`} className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-2xl">📢</span>
              <div className="flex-1 min-w-[220px]"><b>{event.title}</b><p className="text-sm text-amber-800">{event.description}</p><p className="text-xs font-semibold text-amber-700 mt-1">효과: {eventEffectSummary(event)}</p></div>
              <span className="text-xs text-amber-700">적용 {Number(event.multiplier) || 1}배</span>
              <button onClick={() => clear(event.id)} disabled={busy} className="rounded-xl border border-amber-300 px-3 py-2 text-sm text-amber-700 disabled:opacity-40">이벤트 종료</button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)]">
        <div>
          <label className="text-sm text-gray-500 block mb-1">발동할 이벤트</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 outline-none focus:border-amber-400">
            {categoryOrder.map((category) => (
              <optgroup key={category} label={category}>
                {ECONOMY_EVENTS.filter((item) => item.category === category).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </optgroup>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-2">{selected.description}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 text-sm space-y-1">
          <div className="text-gray-400">선택한 효과</div>
          <div className="font-bold text-gray-700">{selected.title}</div>
          <div className="text-indigo-600">{eventEffectSummary(selected)}</div>
          {selectedIsActive && <div className="text-rose-500">이미 발동 중인 이벤트입니다.</div>}
        </div>
      </div>
      <button onClick={trigger} disabled={busy || currentEvents.length >= 3 || selectedIsActive} className="w-full rounded-2xl px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow disabled:opacity-40">{busy ? '적용 중…' : `「${selected.title}」 발동하기`}</button>
      {msg && <div className="rounded-xl bg-indigo-50 text-indigo-700 px-3 py-2 text-sm">{msg}</div>}
    </section>
  );
}
