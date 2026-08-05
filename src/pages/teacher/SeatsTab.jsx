import { useEffect, useRef, useState } from 'react';
import {
  collection, doc, query, orderBy, limit, onSnapshot,
  addDoc, updateDoc, deleteDoc, setDoc, getDocs, writeBatch, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { fmtLeft } from '../student/SeatsPage.jsx';
import { isActiveStudent } from '../../lib/studentState';
import { TAX_LEDGER_ID } from '../../lib/taxes';
import {
  DEFAULT_SEAT_PRIORITY_BASE_PRICE, DEFAULT_SEAT_PRIORITY_SLOTS, DEFAULT_SEAT_PRIORITY_STEP,
  priorityBasePrice, priorityRankPrice, prioritySlots, priorityStep,
} from '../../lib/seatPriority';

const card = 'bg-white rounded-3xl shadow p-6';
const input = 'rounded-xl border-2 border-gray-200 px-3 py-2 focus:border-indigo-400 outline-none';
const btn = 'rounded-xl px-4 py-2 text-white shadow transition disabled:opacity-40';

export default function SeatsTab({ klass }) {
  const [students, setStudents] = useState([]);
  const [seats, setSeats] = useState({});
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState({});
  const [priorityMarket, setPriorityMarket] = useState(null);
  const [priorityBids, setPriorityBids] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null); // {rows, cols, seats:Set}
  const [manage, setManage] = useState(null); // 선택된 seatKey
  const [assignTo, setAssignTo] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [startPrice, setStartPrice] = useState(10);
  const [priorityMinutes, setPriorityMinutes] = useState(10);
  const [prioritySlotCount, setPrioritySlotCount] = useState(DEFAULT_SEAT_PRIORITY_SLOTS);
  const [priorityBase, setPriorityBase] = useState(DEFAULT_SEAT_PRIORITY_BASE_PRICE);
  const [priorityIncrement, setPriorityIncrement] = useState(DEFAULT_SEAT_PRIORITY_STEP);
  const [now, setNow] = useState(Date.now());
  const [msg, setMsg] = useState('');
  const finalizing = useRef(false);
  const priorityFinalizing = useRef(false);

  const layout = klass.seatLayout;
  const live = auction && auction.status === 'active';
  const remaining = live ? auction.endsAt - now : 0;
  const priorityLive = priorityMarket && priorityMarket.status === 'active';
  const priorityRemaining = priorityLive ? priorityMarket.endsAt - now : 0;

  useEffect(() => {
    setPrioritySlotCount(prioritySlots(klass.seatPrioritySlots));
    setPriorityBase(priorityBasePrice(klass.seatPriorityBasePrice));
    setPriorityIncrement(priorityStep(klass.seatPriorityStep));
  }, [klass.id, klass.seatPrioritySlots, klass.seatPriorityBasePrice, klass.seatPriorityStep]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'students'), orderBy('name'));
    return onSnapshot(q, (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent)));
  }, [klass.id]);

  useEffect(() => {
    return onSnapshot(collection(db, 'classes', klass.id, 'seats'), (snap) => {
      const m = {};
      snap.docs.forEach((d) => { m[d.id] = d.data(); });
      setSeats(m);
    });
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'auctions'), orderBy('createdAt', 'desc'), limit(1));
    return onSnapshot(q, (snap) => {
      setAuction(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
    });
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'seatPriorityMarkets'), orderBy('createdAt', 'desc'), limit(1));
    return onSnapshot(q, (snap) => {
      setPriorityMarket(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
    });
  }, [klass.id]);

  useEffect(() => {
    if (!auction) { setBids({}); return; }
    return onSnapshot(collection(db, 'classes', klass.id, 'auctions', auction.id, 'bids'), (snap) => {
      const m = {};
      snap.docs.forEach((d) => { m[d.id] = d.data(); });
      setBids(m);
    });
  }, [klass.id, auction?.id]);

  useEffect(() => {
    if (!priorityMarket) { setPriorityBids({}); return; }
    return onSnapshot(collection(db, 'classes', klass.id, 'seatPriorityMarkets', priorityMarket.id, 'bids'), (snap) => {
      const m = {};
      snap.docs.forEach((d) => { m[d.id] = d.data(); });
      setPriorityBids(m);
    });
  }, [klass.id, priorityMarket?.id]);

  useEffect(() => {
    if (!live && !priorityLive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live, priorityLive]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  /* ----- 배치 편집 ----- */
  const startEdit = () => {
    const rows = layout?.rows || 5, cols = layout?.cols || 5;
    const seatSet = layout
      ? new Set(layout.seats)
      : new Set(Array.from({ length: rows * cols }, (_, i) => `${Math.floor(i / cols)}-${i % cols}`));
    setDraft({ rows, cols, seats: seatSet });
    setEditing(true);
  };

  const resize = (rows, cols) => {
    rows = Math.max(1, Math.min(10, rows));
    cols = Math.max(1, Math.min(10, cols));
    const seats = new Set([...draft.seats].filter((k) => {
      const [r, c] = k.split('-').map(Number);
      return r < rows && c < cols;
    }));
    setDraft({ rows, cols, seats });
  };

  const saveLayout = async () => {
    await updateDoc(doc(db, 'classes', klass.id), {
      seatLayout: { rows: draft.rows, cols: draft.cols, seats: [...draft.seats] },
    });
    setEditing(false);
    flash('✅ 자리 배치를 저장했어요!');
  };

  /* ----- 경매 ----- */
  const hasPendingPrioritySelection = priorityMarket?.status === 'closed'
    && (priorityMarket.winners || []).some((winner) => {
      const winnerStudent = students.find((student) => student.id === winner.studentId);
      return winnerStudent?.seatPriority?.marketId === priorityMarket.id
        && winnerStudent.seatPriority.status === 'selecting';
    });

  const startAuction = async () => {
    if (priorityLive) return flash('고정자리 선택권 시장을 먼저 종료해 주세요.');
    if (hasPendingPrioritySelection) return flash('고정자리 선택권 당첨 학생들이 먼저 자리를 선택해야 해요.');
    const open = (layout.seats || []).filter((k) => !seats[k]);
    if (!open.length) return flash('경매에 올릴 빈 자리가 없어요. (소유 해제 후 시도)');
    await addDoc(collection(db, 'classes', klass.id, 'auctions'), {
      status: 'active',
      startPrice: Math.max(1, Number(startPrice) || 1),
      endsAt: Date.now() + Math.max(1, Number(minutes) || 1) * 60000,
      seatKeys: open,
      createdAt: serverTimestamp(),
    });
    flash(`🔨 ${open.length}개 자리 경매 시작! (${minutes}분)`);
  };

  const startPriorityMarket = async () => {
    if (!layout) return flash('먼저 자리 배치도를 만들어 주세요.');
    if (live) return flash('일반 자리 경매가 진행 중일 때는 고정자리 시장을 열 수 없어요.');
    if (priorityLive) return flash('고정자리 선택권 시장이 이미 열려 있어요.');
    if (hasPendingPrioritySelection) return flash('이전 고정자리 선택권 당첨자들이 먼저 자리를 선택해야 해요.');
    const open = (layout.seats || []).filter((k) => !seats[k]);
    if (!open.length) return flash('고정자리 선택권을 배정할 빈 자리가 없어요.');
    const slots = prioritySlots(prioritySlotCount);
    const basePrice = priorityBasePrice(priorityBase);
    const step = priorityStep(priorityIncrement);
    const duration = Math.max(1, Number(priorityMinutes) || 1);
    await updateDoc(doc(db, 'classes', klass.id), {
      seatPrioritySlots: slots,
      seatPriorityBasePrice: basePrice,
      seatPriorityStep: step,
      seatPriorityEnabled: true,
    });
    await addDoc(collection(db, 'classes', klass.id, 'seatPriorityMarkets'), {
      status: 'active',
      slots,
      basePrice,
      step,
      endsAt: Date.now() + duration * 60000,
      createdAt: serverTimestamp(),
    });
    flash(`🏅 ${slots}등까지 고정자리 선택권 시장을 열었어요! (${duration}분)`);
  };

  const finalizePriorityMarket = async () => {
    if (priorityFinalizing.current || !priorityMarket || priorityMarket.status !== 'active') return;
    priorityFinalizing.current = true;
    try {
      const bidSnap = await getDocs(collection(db, 'classes', klass.id, 'seatPriorityMarkets', priorityMarket.id, 'bids'));
      const bidDocs = bidSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const winners = [];
      for (let rank = 1; rank <= prioritySlots(priorityMarket.slots); rank += 1) {
        const candidate = bidDocs
          .filter((bid) => Number(bid.rank) === rank)
          .sort((a, b) => Number(b.amount) - Number(a.amount) || Number(a.at || 0) - Number(b.at || 0))[0];
        if (candidate) winners.push({
          rank,
          studentId: candidate.studentId,
          studentName: candidate.studentName,
          amount: Math.floor(Number(candidate.amount) || 0),
          tax: Math.floor(Number(candidate.tax) || 0),
        });
      }
      const winnerIds = new Set(winners.map((winner) => winner.studentId));
      const batch = writeBatch(db);
      let returnedTax = 0;
      bidDocs.forEach((bid) => {
        const bidAmount = Math.floor(Number(bid.amount) || 0);
        const bidTax = Math.floor(Number(bid.tax) || 0);
        const studentRef = doc(db, 'classes', klass.id, 'students', bid.studentId);
        const winner = winners.find((item) => item.studentId === bid.studentId);
        if (winner && winnerIds.has(bid.studentId)) {
          batch.update(studentRef, {
            seatPriority: {
              marketId: priorityMarket.id,
              rank: winner.rank,
              status: 'selecting',
              seatKey: null,
              bidAmount,
              bidTax,
              at: Date.now(),
            },
          });
        } else {
          batch.update(studentRef, { cash: increment(bidAmount + bidTax) });
          returnedTax += bidTax;
        }
      });
      if (returnedTax > 0) {
        batch.update(doc(db, 'classes', klass.id, 'taxLedger', TAX_LEDGER_ID), {
          pending: increment(-returnedTax),
          seat: increment(-returnedTax),
          updatedAt: Date.now(),
        });
      }
      batch.update(doc(db, 'classes', klass.id, 'seatPriorityMarkets', priorityMarket.id), {
        status: 'closed',
        closedAt: Date.now(),
        winners,
      });
      await batch.commit();
      flash(`🏅 고정자리 선택권 시장을 마감했어요. ${winners.length}명이 순위를 얻었어요.`);
    } finally {
      priorityFinalizing.current = false;
    }
  };

  const finalize = async () => {
    if (finalizing.current || !auction) return;
    finalizing.current = true;
    try {
      const bidSnap = await getDocs(collection(db, 'classes', klass.id, 'auctions', auction.id, 'bids'));
      const batch = writeBatch(db);
      let winners = 0;
      bidSnap.docs.forEach((d) => {
        const b = d.data();
        batch.set(doc(db, 'classes', klass.id, 'seats', d.id), {
          ownerId: b.studentId, ownerName: b.studentName, price: b.amount, at: Date.now(),
        });
        winners++;
      });
      batch.update(doc(db, 'classes', klass.id, 'auctions', auction.id), { status: 'closed' });
      await batch.commit();
      flash(`🎉 경매 정산 완료! ${winners}개 자리에 새 주인이 생겼어요.`);
    } finally {
      finalizing.current = false;
    }
  };

  // 시간이 다 되면 자동 정산
  useEffect(() => {
    if (live && remaining <= 0) finalize();
  }, [live, remaining <= 0]);

  useEffect(() => {
    if (priorityLive && priorityRemaining <= 0) finalizePriorityMarket();
  }, [priorityLive, priorityRemaining <= 0, priorityMarket?.id]);

  /* ----- 수동 관리 ----- */
  const assign = async () => {
    const st = students.find((s) => s.id === assignTo);
    if (!st || !manage) return;
    await setDoc(doc(db, 'classes', klass.id, 'seats', manage), {
      ownerId: st.id, ownerName: st.name, price: 0, at: Date.now(),
    });
    setManage(null); setAssignTo('');
  };

  const unassign = async () => {
    await deleteDoc(doc(db, 'classes', klass.id, 'seats', manage));
    setManage(null);
  };

  const resetAll = async () => {
    if (!confirm('모든 자리의 소유권을 초기화할까요? (환불되지 않아요)')) return;
    const snap = await getDocs(collection(db, 'classes', klass.id, 'seats'));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    flash('자리 소유권을 모두 초기화했어요.');
  };

  const grid = editing ? draft : layout;

  return (
    <div className="space-y-4">
      {msg && <div className="bg-indigo-50 text-indigo-700 rounded-2xl px-4 py-3">{msg}</div>}

      {/* 경매 컨트롤 */}
      <div className={card}>
        <h3 className="text-xl mb-3">🔨 자리 경매</h3>
        {live ? (
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`text-3xl tabular-nums ${remaining > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
              {fmtLeft(remaining)}
            </div>
            <div className="text-gray-500">
              경매 대상 {auction.seatKeys?.length}자리 · 입찰 {Object.keys(bids).length}건 · 시작가 {fmt(auction.startPrice)} {klass.currency}
            </div>
            <button onClick={finalize} className={btn + ' bg-rose-500 hover:bg-rose-600 ml-auto'}>
              ⏹️ 지금 종료·정산
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-gray-400 block">경매 시간(분)</label>
              <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={input + ' w-24'} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block">시작가</label>
              <input type="number" value={startPrice} onChange={(e) => setStartPrice(e.target.value)} className={input + ' w-24'} />
            </div>
            <button onClick={startAuction} disabled={!layout} className={btn + ' bg-rose-500 hover:bg-rose-600 text-lg'}>
              🔨 빈 자리 경매 시작
            </button>
            <p className="text-xs text-gray-400 w-full">
              소유자가 없는 자리가 모두 경매에 올라가요. 학생은 자리 탭에서 실시간 입찰하고, 시간이 끝나면 최고 입찰자가 자리를 가져요. (입찰금은 즉시 차감, 더 높은 입찰이 나오면 자동 환불)
            </p>
          </div>
        )}
      </div>

      {/* ----- 고정자리 선택권 시장 ----- */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="text-xl">🏅 고정자리 선택권</h3>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">선택 사용</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          일반 자리 경매 전에 선택권을 입찰로 판매해요. 당첨자는 1등부터 순서대로 원하는 빈 자리를 고를 수 있어요.
        </p>
        {priorityLive ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`text-3xl tabular-nums ${priorityRemaining > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                {fmtLeft(priorityRemaining)}
              </div>
              <div className="text-gray-500">
                {priorityMarket.slots}등까지 · 입찰 {Object.keys(priorityBids).length}건 · 1등 시작가 {fmt(priorityMarket.basePrice)} {klass.currency}
              </div>
              <button onClick={finalizePriorityMarket} className={btn + ' bg-amber-500 hover:bg-amber-600 ml-auto'}>
                ⏹️ 시장 종료·정산
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {Array.from({ length: prioritySlots(priorityMarket.slots) }, (_, index) => {
                const rank = index + 1;
                const rankBids = Object.values(priorityBids).filter((bid) => Number(bid.rank) === rank);
                const top = rankBids.sort((a, b) => Number(b.amount) - Number(a.amount))[0];
                return (
                  <div key={rank} className="rounded-xl border border-amber-100 bg-amber-50 p-2 text-center">
                    <div className="text-xs font-bold text-amber-700">{rank}등 선택권</div>
                    <div className="text-[10px] text-gray-400">기본 {fmt(priorityRankPrice(priorityMarket, rank))}</div>
                    <div className="mt-1 text-sm text-gray-600">{top ? `${top.studentName} · ${fmt(top.amount)}` : '입찰 없음'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-xs text-gray-400 block">선택권 순위 수(최대 5)</label>
                <input type="number" min="1" max="5" value={prioritySlotCount} onChange={(e) => setPrioritySlotCount(e.target.value)} className={input + ' w-24'} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block">1등 기본 입찰가(최소 1000)</label>
                <input type="number" min="1000" value={priorityBase} onChange={(e) => setPriorityBase(e.target.value)} className={input + ' w-32'} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block">등수별 증가액</label>
                <input type="number" min="0" value={priorityIncrement} onChange={(e) => setPriorityIncrement(e.target.value)} className={input + ' w-28'} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block">시장 시간(분)</label>
                <input type="number" min="1" value={priorityMinutes} onChange={(e) => setPriorityMinutes(e.target.value)} className={input + ' w-24'} />
              </div>
              <button onClick={startPriorityMarket} disabled={!layout || live || hasPendingPrioritySelection} className={btn + ' bg-amber-500 hover:bg-amber-600 text-lg'}>
                🏅 고정자리 시장 열기
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {Array.from({ length: prioritySlots(prioritySlotCount) }, (_, index) => {
                const rank = index + 1;
                return (
                  <div key={rank} className="rounded-xl border border-gray-100 bg-gray-50 p-2 text-center text-xs text-gray-500">
                    <b className="text-amber-600">{rank}등</b><br />기본 {fmt(priorityRankPrice({ basePrice: priorityBase, step: priorityIncrement }, rank))}
                  </div>
                );
              })}
            </div>
            {priorityMarket?.status === 'closed' && (
              <p className="text-xs text-emerald-600">
                최근 시장 마감 · 당첨자 {priorityMarket.winners?.length || 0}명
                {hasPendingPrioritySelection && ' · 당첨자 선택이 끝나면 일반 자리 경매를 열 수 있어요.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 배치도 */}
      <div className={card}>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h3 className="text-xl">🪑 자리 배치도</h3>
          {editing ? (
            <>
              <label className="text-sm text-gray-400">
                줄 <input type="number" value={draft.rows} onChange={(e) => resize(Number(e.target.value), draft.cols)} className={input + ' w-16 ml-1'} />
              </label>
              <label className="text-sm text-gray-400">
                칸 <input type="number" value={draft.cols} onChange={(e) => resize(draft.rows, Number(e.target.value))} className={input + ' w-16 ml-1'} />
              </label>
              <span className="text-xs text-gray-400">칸을 클릭해 자리를 넣거나 빼세요</span>
              <button onClick={saveLayout} className={btn + ' bg-indigo-500 hover:bg-indigo-600 ml-auto'}>💾 저장</button>
              <button onClick={() => setEditing(false)} className="text-gray-400 underline text-sm">취소</button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className={btn + ' bg-indigo-400 hover:bg-indigo-500 text-sm ml-auto'}>
                {layout ? '✏️ 배치 편집' : '🪑 배치도 만들기 (5×5)'}
              </button>
              {layout && <button onClick={resetAll} className="text-sm text-gray-400 underline">소유권 전체 초기화</button>}
            </>
          )}
        </div>

        {grid ? (
          <>
            <div className="bg-emerald-800 text-emerald-100 text-center rounded-xl py-1.5 mb-3 tracking-widest text-sm">📗 칠판 (앞)</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: grid.rows * grid.cols }, (_, i) => {
                const r = Math.floor(i / grid.cols), c = i % grid.cols;
                const key = `${r}-${c}`;
                const active = editing ? draft.seats.has(key) : (layout.seats || []).includes(key);
                const owner = seats[key];
                const bid = bids[key];
                if (editing) {
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        const s = new Set(draft.seats);
                        s.has(key) ? s.delete(key) : s.add(key);
                        setDraft({ ...draft, seats: s });
                      }}
                      className={`rounded-xl border-2 min-h-12 text-xs transition ${
                        active ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-dashed border-gray-200 text-gray-300'
                      }`}
                    >
                      {active ? `${r + 1}-${c + 1}` : '+'}
                    </button>
                  );
                }
                if (!active) return <div key={key} />;
                return (
                  <button
                    key={key}
                    onClick={() => { setManage(key); setAssignTo(''); }}
                    className={`rounded-xl border-2 min-h-14 p-1 text-center transition hover:scale-105 ${
                      owner ? 'border-teal-300 bg-teal-50' : live && bid ? 'border-rose-300 bg-rose-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-[10px] text-gray-400">{r + 1}-{c + 1}</div>
                    {owner ? (
                      <div className="text-xs text-teal-700 leading-tight">{owner.ownerName}</div>
                    ) : live && bid ? (
                      <div className="text-[11px] text-rose-500 leading-tight">{bid.studentName}<br />{fmt(bid.amount)}</div>
                    ) : (
                      <div className="text-[11px] text-gray-300">빈 자리</div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-center py-6">
            '배치도 만들기'를 눌러 우리 반 자리를 만들어 보세요. 5×5 등 원하는 모양으로 자유롭게 배치할 수 있어요.
          </p>
        )}
      </div>

      {/* 자리 관리 패널 */}
      {manage && !editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setManage(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl">🪑 {Number(manage.split('-')[0]) + 1}-{Number(manage.split('-')[1]) + 1} 자리 관리</h3>
            {seats[manage] ? (
              <>
                <p className="text-gray-600">
                  현재 주인: <b className="text-teal-600">{seats[manage].ownerName}</b>
                  <span className="text-sm text-gray-400 ml-2">({fmt(seats[manage].price)} {klass.currency}에 구매)</span>
                </p>
                <button onClick={unassign} className={btn + ' bg-rose-500 hover:bg-rose-600 w-full'}>소유 해제</button>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-sm">빈 자리예요. 학생에게 직접 지정할 수도 있어요.</p>
                <div className="flex gap-2">
                  <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className={input + ' flex-1'}>
                    <option value="">학생 선택...</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={assign} disabled={!assignTo} className={btn + ' bg-teal-500 hover:bg-teal-600'}>지정</button>
                </div>
              </>
            )}
            <button onClick={() => setManage(null)} className="w-full text-gray-400 text-sm underline">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
