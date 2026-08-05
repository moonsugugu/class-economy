import { useEffect, useRef, useState } from 'react';
import {
  collection, doc, query, orderBy, limit, onSnapshot,
  addDoc, updateDoc, deleteDoc, setDoc, getDocs, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { fmtLeft } from '../student/SeatsPage.jsx';
import { isActiveStudent } from '../../lib/studentState';

const card = 'bg-white rounded-3xl shadow p-6';
const input = 'rounded-xl border-2 border-gray-200 px-3 py-2 focus:border-indigo-400 outline-none';
const btn = 'rounded-xl px-4 py-2 text-white shadow transition disabled:opacity-40';

export default function SeatsTab({ klass }) {
  const [students, setStudents] = useState([]);
  const [seats, setSeats] = useState({});
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null); // {rows, cols, seats:Set}
  const [manage, setManage] = useState(null); // 선택된 seatKey
  const [assignTo, setAssignTo] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [startPrice, setStartPrice] = useState(10);
  const [now, setNow] = useState(Date.now());
  const [msg, setMsg] = useState('');
  const finalizing = useRef(false);

  const layout = klass.seatLayout;
  const live = auction && auction.status === 'active';
  const remaining = live ? auction.endsAt - now : 0;

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
    if (!auction) { setBids({}); return; }
    return onSnapshot(collection(db, 'classes', klass.id, 'auctions', auction.id, 'bids'), (snap) => {
      const m = {};
      snap.docs.forEach((d) => { m[d.id] = d.data(); });
      setBids(m);
    });
  }, [klass.id, auction?.id]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);

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
  const startAuction = async () => {
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
