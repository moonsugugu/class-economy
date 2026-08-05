import { useState } from 'react';
import {
  collection, doc, getDoc, getDocs, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { advance, MARKET_PATH } from '../../lib/stocks';
import { ECONOMY_EVENTS, activeEconomyEvent } from '../../lib/economyEvents.js';
import { isActiveStudent } from '../../lib/studentState';

const categoryOrder = ['지원금', '농업·물가', '은행·금리', '주식시장', '세금·물가', '정책', '학급 특별'];

export default function EconomyEventsPanel({ klass }) {
  const [selectedId, setSelectedId] = useState(ECONOMY_EVENTS[0].id);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const current = activeEconomyEvent(klass);
  const selected = ECONOMY_EVENTS.find((item) => item.id === selectedId) || ECONOMY_EVENTS[0];
  const pendingMultiplier = Number(klass.eventNextMultiplier);

  const flash = (text) => {
    setMsg(text);
    window.setTimeout(() => setMsg(''), 3500);
  };

  const trigger = async () => {
    if (busy) return;
    const previewMultiplier = pendingMultiplier > 0 && !selected.effects.nextMultiplier ? pendingMultiplier : 1;
    const suffix = previewMultiplier > 1 ? ` 다음 이벤트 효과 ${previewMultiplier}배` : '';
    if (!window.confirm(`「${selected.title}」을 발동할까요?${suffix}`)) return;
    setBusy(true);
    try {
      const classRef = doc(db, 'classes', klass.id);
      const [studentSnap, marketSnap, classSnap] = await Promise.all([
        getDocs(collection(db, 'classes', klass.id, 'students')),
        getDoc(doc(db, ...MARKET_PATH(klass.id))),
        getDoc(classRef),
      ]);
      const latestClass = classSnap.exists() ? { ...klass, ...classSnap.data() } : klass;
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
        const stocks = market.stocks.map((stock) => {
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

      const nextMultiplier = Number(effects.nextMultiplier) > 0 ? Number(effects.nextMultiplier) : 0;
      batch.update(classRef, {
        economyEvent: {
          id: selected.id,
          category: selected.category,
          title: selected.title,
          description: selected.description,
          effects,
          multiplier,
          at: Date.now(),
        },
        eventNextMultiplier: nextMultiplier,
        updatedAt: Date.now(),
      });
      await batch.commit();
      const stockHint = (Number(effects.stockChangePct) || Number(effects.targetStockChangePct)) ? ' 주식 시세도 반영됐어요.' : '';
      flash(`${selected.title} 발동 완료! ${changedStudents ? `${changedStudents}명에게 금액 효과를 적용했어요.` : ''}${stockHint}`);
    } catch (error) {
      flash(`이벤트 발동 실패: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!current || !window.confirm('현재 경제 이벤트를 종료할까요?')) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'classes', klass.id), { economyEvent: null, eventNextMultiplier: 0, updatedAt: Date.now() });
      flash('현재 경제 이벤트를 종료했어요.');
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
          <h3 className="text-xl text-amber-700">📢 경제 이벤트 발동</h3>
          <p className="text-sm text-gray-500 mt-1">이벤트를 선택하면 모든 학생 화면 맨 위에 전광판으로 표시되고, 해당 효과가 바로 적용됩니다.</p>
        </div>
        {pendingMultiplier > 0 && <span className="rounded-full bg-fuchsia-100 text-fuchsia-700 px-3 py-1 text-sm font-bold">다음 이벤트 {pendingMultiplier}배</span>}
      </div>

      {current && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-2xl">📣</span>
          <div className="flex-1"><b>{current.title}</b><p className="text-sm text-amber-800">{current.description}</p></div>
          <span className="text-xs text-amber-700">효과 {Number(klass.economyEvent?.multiplier) || 1}배</span>
          <button onClick={clear} disabled={busy} className="rounded-xl border border-amber-300 px-3 py-2 text-sm text-amber-700 disabled:opacity-40">이벤트 종료</button>
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
          {selected.effects.cashDelta && <div>학생 현금 {selected.effects.cashDelta > 0 ? '+' : ''}{fmt(selected.effects.cashDelta)}</div>}
          {selected.effects.priceMultiplier && <div>물품 가격 ×{selected.effects.priceMultiplier}</div>}
          {selected.effects.stockChangePct && <div>전체 주식 {selected.effects.stockChangePct > 0 ? '+' : ''}{selected.effects.stockChangePct}%</div>}
          {selected.effects.nextMultiplier && <div>다음 이벤트 ×{selected.effects.nextMultiplier}</div>}
        </div>
      </div>
      <button onClick={trigger} disabled={busy} className="w-full rounded-2xl px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow disabled:opacity-40">{busy ? '적용 중…' : `「${selected.title}」 발동하기`}</button>
      {msg && <div className="rounded-xl bg-indigo-50 text-indigo-700 px-3 py-2 text-sm">{msg}</div>}
    </section>
  );
}
