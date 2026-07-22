import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, query, orderBy, limit, onSnapshot, runTransaction,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';

function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function fmtLeft(ms) {
  if (ms <= 0) return '종료';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}분 ${s % 60}초` : `${s}초`;
}

export default function SeatsPage() {
  const { klass, student } = useOutletContext();
  const [seats, setSeats] = useState({});
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState({});
  const [sel, setSel] = useState(null); // 입찰 대상 seatKey
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState(null);

  const layout = klass.seatLayout;
  const live = auction && auction.status === 'active';
  const now = useNow(!!live);
  const remaining = live ? auction.endsAt - now : 0;
  const open = live && remaining > 0;

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

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const placeBid = async () => {
    const amt = Math.floor(Number(amount));
    if (!sel || !amt) return;
    const auctionRef = doc(db, 'classes', klass.id, 'auctions', auction.id);
    const bidRef = doc(db, 'classes', klass.id, 'auctions', auction.id, 'bids', sel);
    const myRef = doc(db, 'classes', klass.id, 'students', student.id);
    try {
      await runTransaction(db, async (tx) => {
        const a = (await tx.get(auctionRef)).data();
        if (!a || a.status !== 'active' || Date.now() >= a.endsAt) throw new Error('경매가 이미 끝났어요!');
        const bSnap = await tx.get(bidRef);
        const prev = bSnap.exists() ? bSnap.data() : null;
        const minBid = prev ? prev.amount + 1 : (a.startPrice || 1);
        if (amt < minBid) throw new Error(`최소 ${fmt(minBid)}${klass.currency} 이상 입찰해야 해요!`);
        const me = (await tx.get(myRef)).data();
        if (prev && prev.studentId === student.id) {
          // 내 입찰 올리기: 차액만 추가로 지불
          const extra = amt - prev.amount;
          if (me.cash < extra) throw new Error('현금이 부족해요!');
          tx.update(myRef, { cash: me.cash - extra });
        } else {
          if (me.cash < amt) throw new Error('현금이 부족해요!');
          if (prev) {
            // 이전 최고 입찰자에게 자동 환불
            const prevRef = doc(db, 'classes', klass.id, 'students', prev.studentId);
            const prevSnap = await tx.get(prevRef);
            if (prevSnap.exists()) tx.update(prevRef, { cash: prevSnap.data().cash + prev.amount });
          }
          tx.update(myRef, { cash: me.cash - amt });
        }
        tx.set(bidRef, { amount: amt, studentId: student.id, studentName: student.name, at: Date.now() });
      });
      flash('ok', `🔨 ${fmt(amt)}${klass.currency} 입찰 완료! 더 높은 입찰이 나오면 자동으로 돌려받아요.`);
      setSel(null); setAmount('');
    } catch (e) {
      flash('err', e.message);
    }
  };

  if (!layout) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl text-teal-600">🪑 자리 부동산</h2>
        <div className="bg-white rounded-3xl shadow p-10 text-center text-gray-400">
          아직 선생님이 자리 배치도를 만들지 않았어요.<br />조금만 기다려 주세요!
        </div>
      </div>
    );
  }

  const inAuction = (key) => open && (auction.seatKeys || []).includes(key);
  const mySeats = Object.entries(seats).filter(([, s]) => s.ownerId === student.id);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-teal-600">🪑 자리 부동산</h2>

      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {live && (
        <div className={`rounded-3xl px-5 py-4 text-white shadow-lg ${open ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gray-400'}`}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">🔨</span>
            <div className="flex-1">
              <div className="text-lg">{open ? '자리 경매 진행 중!' : '경매 마감 — 선생님의 정산을 기다려요'}</div>
              <div className="text-sm opacity-90">시작가 {fmt(auction.startPrice || 1)} {klass.currency} · 반짝이는 자리를 눌러 입찰하세요</div>
            </div>
            {open && <div className="text-3xl tabular-nums">{fmtLeft(remaining)}</div>}
          </div>
        </div>
      )}

      {/* 칠판 + 자리 배치도 */}
      <div className="bg-white rounded-3xl shadow p-5">
        <div className="bg-emerald-800 text-emerald-100 text-center rounded-xl py-2 mb-4 tracking-widest">📗 칠판 (앞)</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: layout.rows * layout.cols }, (_, i) => {
            const r = Math.floor(i / layout.cols), c = i % layout.cols;
            const key = `${r}-${c}`;
            if (!(layout.seats || []).includes(key)) return <div key={key} />;
            const owner = seats[key];
            const bid = bids[key];
            const mine = owner?.ownerId === student.id;
            const auctionable = inAuction(key) && !owner;
            const myTop = bid?.studentId === student.id;
            return (
              <button
                key={key}
                disabled={!auctionable}
                onClick={() => { setSel(key); setAmount(String(bid ? bid.amount + 1 : auction?.startPrice || 1)); }}
                className={`rounded-xl border-2 p-1.5 min-h-16 text-center transition ${
                  mine ? 'border-teal-500 bg-teal-50'
                    : auctionable ? (myTop ? 'border-amber-400 bg-amber-50' : 'border-rose-300 bg-rose-50 animate-pulse cursor-pointer hover:scale-105')
                    : owner ? 'border-gray-200 bg-gray-50'
                    : 'border-dashed border-gray-200'
                }`}
              >
                <div className="text-[10px] text-gray-400">{r + 1}-{c + 1}</div>
                {owner ? (
                  <div className={`text-sm leading-tight ${mine ? 'text-teal-700' : 'text-gray-600'}`}>
                    {owner.ownerName}{mine && ' ⭐'}
                  </div>
                ) : bid && open ? (
                  <div className="text-xs leading-tight">
                    <div className={myTop ? 'text-amber-600' : 'text-rose-500'}>{bid.studentName}</div>
                    <div className="tabular-nums text-gray-500">{fmt(bid.amount)}</div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-300">{auctionable ? '입찰 가능' : '빈 자리'}</div>
                )}
              </button>
            );
          })}
        </div>
        {mySeats.length > 0 && (
          <p className="text-sm text-teal-600 mt-3">
            ⭐ 내 자리: {mySeats.map(([k, s]) => `${Number(k.split('-')[0]) + 1}-${Number(k.split('-')[1]) + 1} (${fmt(s.price)}${klass.currency})`).join(', ')}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">입찰하면 그 금액이 바로 빠져나가고, 다른 친구가 더 높게 부르면 자동으로 돌려받아요.</p>
      </div>

      {/* 입찰 모달 */}
      {sel && open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSel(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl mb-1">🔨 {Number(sel.split('-')[0]) + 1}-{Number(sel.split('-')[1]) + 1} 자리 입찰</h3>
            <div className="text-sm text-gray-400 mb-3">
              {bids[sel]
                ? <>현재 최고: <b className="text-rose-500">{bids[sel].studentName}</b> {fmt(bids[sel].amount)} {klass.currency}</>
                : <>아직 입찰 없음 · 시작가 {fmt(auction.startPrice || 1)} {klass.currency}</>}
              <span className="ml-2">· 남은 시간 {fmtLeft(remaining)}</span>
            </div>
            <div className="text-sm text-gray-500 mb-2">내 현금: {fmt(student.cash)} {klass.currency}</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-xl text-center outline-none focus:border-rose-400 mb-3"
            />
            <button onClick={placeBid} className="w-full rounded-2xl py-3 bg-rose-500 hover:bg-rose-600 text-white text-lg">
              입찰하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
