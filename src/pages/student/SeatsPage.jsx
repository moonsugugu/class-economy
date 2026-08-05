import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, query, orderBy, limit, onSnapshot, runTransaction, increment,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { TAX_LEDGER_ID, taxForPart } from '../../lib/taxes';
import { priorityRankPrice, prioritySlots } from '../../lib/seatPriority';

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
  const [priorityMarket, setPriorityMarket] = useState(null);
  const [priorityBids, setPriorityBids] = useState({});
  const [sel, setSel] = useState(null); // 입찰 대상 seatKey
  const [amount, setAmount] = useState('');
  const [priorityRank, setPriorityRank] = useState(1);
  const [priorityAmount, setPriorityAmount] = useState('');
  const [priorityBusy, setPriorityBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const layout = klass.seatLayout;
  const live = auction && auction.status === 'active';
  const priorityLive = priorityMarket && priorityMarket.status === 'active';
  const now = useNow(!!live || !!priorityLive);
  const remaining = live ? auction.endsAt - now : 0;
  const priorityRemaining = priorityLive ? priorityMarket.endsAt - now : 0;
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
    const current = priorityMarket && priorityBids[student.id];
    if (current) {
      setPriorityRank(Number(current.rank) || 1);
      setPriorityAmount(String(current.amount || ''));
    } else if (priorityMarket) {
      setPriorityRank(1);
      setPriorityAmount(String(priorityRankPrice(priorityMarket, 1)));
    }
  }, [priorityMarket?.id, priorityBids[student.id]?.amount, student.id]);

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
    const classRef = doc(db, 'classes', klass.id);
    const ledgerRef = doc(db, 'classes', klass.id, 'taxLedger', TAX_LEDGER_ID);
    let chargedTax = 0;
    try {
      await runTransaction(db, async (tx) => {
        const a = (await tx.get(auctionRef)).data();
        if (!a || a.status !== 'active' || Date.now() >= a.endsAt) throw new Error('경매가 이미 끝났어요!');
        const bSnap = await tx.get(bidRef);
        const prev = bSnap.exists() ? bSnap.data() : null;
        const settings = { ...klass, ...((await tx.get(classRef)).data() || {}) };
        const nextTax = taxForPart(amt, settings, 'seat').tax;
        const previousTax = Number.isFinite(Number(prev?.tax)) ? Math.max(0, Math.floor(Number(prev.tax))) : 0;
        const taxDelta = nextTax - previousTax;
        const minBid = prev ? prev.amount + 1 : (a.startPrice || 1);
        if (amt < minBid) throw new Error(`최소 ${fmt(minBid)}${klass.currency} 이상 입찰해야 해요!`);
        const me = (await tx.get(myRef)).data();
        if (prev && prev.studentId === student.id) {
          // 내 입찰 올리기: 차액만 추가로 지불
          const extra = (amt - prev.amount) + taxDelta;
          if (me.cash < extra) throw new Error('현금이 부족해요!');
          tx.update(myRef, { cash: me.cash - extra });
        } else {
          if (me.cash < amt + nextTax) throw new Error('현금이 부족해요!');
          if (prev) {
            // 이전 최고 입찰자에게 입찰금과 당시 세금을 함께 자동 환불
            const prevRef = doc(db, 'classes', klass.id, 'students', prev.studentId);
            const prevSnap = await tx.get(prevRef);
            if (prevSnap.exists()) tx.update(prevRef, { cash: prevSnap.data().cash + prev.amount + previousTax });
          }
          tx.update(myRef, { cash: me.cash - amt - nextTax });
        }
        if (taxDelta !== 0) {
          tx.set(ledgerRef, {
            pending: increment(taxDelta),
            seat: increment(taxDelta),
            updatedAt: Date.now(),
          }, { merge: true });
        }
        tx.set(bidRef, { amount: amt, tax: nextTax, studentId: student.id, studentName: student.name, at: Date.now() });
        chargedTax = nextTax;
      });
      flash('ok', `🔨 ${fmt(amt)}${klass.currency} 입찰 완료! 세금 ${fmt(chargedTax)}${klass.currency} 포함 · 더 높은 입찰이 나오면 함께 돌려받아요.`);
      setSel(null); setAmount('');
    } catch (e) {
      flash('err', e.message);
    }
  };

  const placePriorityBid = async () => {
    if (priorityBusy || !priorityMarket || priorityMarket.status !== 'active' || priorityRemaining <= 0 || live) return;
    const rank = Math.max(1, Math.min(prioritySlots(priorityMarket.slots), Math.floor(Number(priorityRank) || 1)));
    const amt = Math.floor(Number(priorityAmount));
    const minBid = priorityRankPrice(priorityMarket, rank);
    if (!amt || amt < minBid) {
      return flash('err', `${rank}등 선택권은 ${fmt(minBid)}${klass.currency} 이상 입찰해야 해요.`);
    }
    const marketRef = doc(db, 'classes', klass.id, 'seatPriorityMarkets', priorityMarket.id);
    const bidRef = doc(db, 'classes', klass.id, 'seatPriorityMarkets', priorityMarket.id, 'bids', student.id);
    const myRef = doc(db, 'classes', klass.id, 'students', student.id);
    const classRef = doc(db, 'classes', klass.id);
    const ledgerRef = doc(db, 'classes', klass.id, 'taxLedger', TAX_LEDGER_ID);
    let chargedTax = 0;
    setPriorityBusy(true);
    try {
      await runTransaction(db, async (tx) => {
        const marketSnap = await tx.get(marketRef);
        const market = marketSnap.data();
        if (!market || market.status !== 'active' || Date.now() >= market.endsAt) throw new Error('고정자리 선택권 시장이 이미 끝났어요.');
        const previousSnap = await tx.get(bidRef);
        const previous = previousSnap.exists() ? previousSnap.data() : null;
        const meSnap = await tx.get(myRef);
        const me = meSnap.data() || {};
        if (me.seatPriority?.status === 'selecting') throw new Error('이미 선택권을 가지고 있어 자리를 먼저 선택해 주세요.');
        const settings = { ...klass, ...((await tx.get(classRef)).data() || {}) };
        const nextTax = taxForPart(amt, settings, 'seat').tax;
        const previousAmount = Math.floor(Number(previous?.amount) || 0);
        const previousTax = Math.floor(Number(previous?.tax) || 0);
        const previousRank = Number(previous?.rank) || 0;
        if (previous && previousRank === rank && amt <= previousAmount) {
          throw new Error(`내 현재 입찰가 ${fmt(previousAmount)}${klass.currency}보다 높게 써 주세요.`);
        }
        const netCost = previous
          ? (amt + nextTax) - (previousAmount + previousTax)
          : amt + nextTax;
        const cash = Number(me.cash) || 0;
        if (cash < netCost) throw new Error('현금이 부족해요.');
        tx.update(myRef, { cash: cash - netCost });
        const taxDelta = nextTax - previousTax;
        if (taxDelta !== 0) {
          tx.set(ledgerRef, {
            pending: increment(taxDelta),
            seat: increment(taxDelta),
            updatedAt: Date.now(),
          }, { merge: true });
        }
        tx.set(bidRef, {
          rank,
          amount: amt,
          tax: nextTax,
          studentId: student.id,
          studentName: student.name,
          at: Date.now(),
        });
        chargedTax = nextTax;
      });
      setPriorityRank(rank);
      setPriorityAmount(String(amt));
      flash('ok', `🏅 ${rank}등 선택권에 ${fmt(amt)}${klass.currency} 입찰 완료! 세금 ${fmt(chargedTax)}${klass.currency} 포함`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setPriorityBusy(false);
    }
  };

  const choosePrioritySeat = async (seatKey) => {
    const right = student.seatPriority;
    if (priorityBusy || !priorityMarket || priorityMarket.status !== 'closed' || right?.marketId !== priorityMarket.id || right.status !== 'selecting') return;
    if (live) return flash('err', '일반 자리 경매가 끝난 뒤 선택해 주세요.');
    const marketRef = doc(db, 'classes', klass.id, 'seatPriorityMarkets', priorityMarket.id);
    const myRef = doc(db, 'classes', klass.id, 'students', student.id);
    const seatRef = doc(db, 'classes', klass.id, 'seats', seatKey);
    setPriorityBusy(true);
    try {
      await runTransaction(db, async (tx) => {
        const market = (await tx.get(marketRef)).data();
        const meSnap = await tx.get(myRef);
        const me = meSnap.data() || {};
        const seatSnap = await tx.get(seatRef);
        const currentRight = me.seatPriority;
        if (!market || market.status !== 'closed' || currentRight?.status !== 'selecting') throw new Error('선택권이 유효하지 않아요.');
        if (seatSnap.exists()) throw new Error('방금 다른 친구가 먼저 선택한 자리예요.');
        const winners = market.winners || [];
        const previousWinners = winners.filter((winner) => Number(winner.rank) < Number(currentRight.rank));
        for (const winner of previousWinners) {
          const previous = (await tx.get(doc(db, 'classes', klass.id, 'students', winner.studentId))).data();
          if (previous?.seatPriority?.marketId !== priorityMarket.id || previous.seatPriority.status !== 'selected') {
            throw new Error(`${winner.rank}등 선택권 학생이 먼저 자리를 골라야 해요.`);
          }
        }
        tx.set(seatRef, {
          ownerId: student.id,
          ownerName: student.name,
          price: Number(currentRight.bidAmount) || 0,
          priorityRank: currentRight.rank,
          priorityMarketId: priorityMarket.id,
          at: Date.now(),
        });
        tx.update(myRef, {
          seatPriority: { ...currentRight, status: 'selected', seatKey, selectedAt: Date.now() },
        });
      });
      flash('ok', `⭐ ${Number(seatKey.split('-')[0]) + 1}-${Number(seatKey.split('-')[1]) + 1} 자리를 선택했어요!`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setPriorityBusy(false);
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
  const myPriorityBid = priorityBids[student.id];
  const priorityRight = student.seatPriority;
  const prioritySelecting = priorityMarket?.status === 'closed'
    && priorityRight?.marketId === priorityMarket.id
    && priorityRight.status === 'selecting';

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-teal-600">🪑 자리 부동산</h2>

      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {priorityLive && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-4 text-white shadow-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">🏅</span>
            <div className="flex-1">
              <div className="text-lg">고정자리 선택권 시장 진행 중!</div>
              <div className="text-sm opacity-90">{priorityMarket.slots}등까지 입찰할 수 있어요. 당첨자는 등수 순서대로 자리를 고릅니다.</div>
            </div>
            <div className="text-3xl tabular-nums">{fmtLeft(priorityRemaining)}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Array.from({ length: prioritySlots(priorityMarket.slots) }, (_, index) => {
              const rank = index + 1;
              const rankBid = Object.values(priorityBids).filter((bid) => Number(bid.rank) === rank).sort((a, b) => Number(b.amount) - Number(a.amount))[0];
              return (
                <div key={rank} className="rounded-xl bg-white/20 px-2 py-1.5 text-center text-xs">
                  <b>{rank}등</b> 기본 {fmt(priorityRankPrice(priorityMarket, rank))}<br />
                  <span className="text-white/80">{rankBid ? `${rankBid.studentName} · ${fmt(rankBid.amount)}` : '입찰 없음'}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-2xl bg-white/15 p-3">
            <div className="mb-2 text-sm">내 선택권 입찰</div>
            <div className="flex flex-wrap gap-2">
              <select
                value={priorityRank}
                onChange={(e) => {
                  const rank = Number(e.target.value);
                  setPriorityRank(rank);
                  setPriorityAmount(String(Math.max(Number(priorityAmount) || 0, priorityRankPrice(priorityMarket, rank))));
                }}
                className="rounded-xl px-3 py-2 text-gray-700 outline-none"
              >
                {Array.from({ length: prioritySlots(priorityMarket.slots) }, (_, index) => {
                  const rank = index + 1;
                  return <option key={rank} value={rank}>{rank}등 선택권 · 기본 {fmt(priorityRankPrice(priorityMarket, rank))}</option>;
                })}
              </select>
              <input
                type="number"
                min={priorityRankPrice(priorityMarket, priorityRank)}
                value={priorityAmount}
                onChange={(e) => setPriorityAmount(e.target.value)}
                className="w-32 rounded-xl px-3 py-2 text-right text-gray-700 outline-none"
                placeholder="입찰금"
              />
              <button onClick={placePriorityBid} disabled={priorityBusy} className="rounded-xl bg-white px-4 py-2 font-bold text-amber-600 shadow disabled:opacity-50">
                {priorityBusy ? '처리 중...' : myPriorityBid ? '입찰 올리기' : '선택권 입찰'}
              </button>
            </div>
            {myPriorityBid && <p className="mt-2 text-xs text-white/80">현재 내 입찰: {myPriorityBid.rank}등 · {fmt(myPriorityBid.amount)} {klass.currency} · 더 높은 입찰이 나오면 시장 종료 때 환불돼요.</p>}
          </div>
        </div>
      )}

      {prioritySelecting && (
        <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 shadow">
          <div className="text-lg font-bold">🏅 {priorityRight.rank}등 고정자리 선택권을 얻었어요!</div>
          <p className="mt-1 text-sm">내 앞 순위 학생이 먼저 선택한 뒤, 아래 자리 배치도에서 빈 자리를 눌러 원하는 자리를 골라 주세요.</p>
          {live && <p className="mt-1 text-xs text-rose-500">일반 자리 경매가 끝난 뒤 선택할 수 있어요.</p>}
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
            const priorityChoice = prioritySelecting && !live && !owner;
            const auctionable = inAuction(key) && !owner;
            const myTop = bid?.studentId === student.id;
            return (
              <button
                key={key}
                disabled={!priorityChoice && !auctionable}
                onClick={() => {
                  if (priorityChoice) choosePrioritySeat(key);
                  else if (auctionable) { setSel(key); setAmount(String(bid ? bid.amount + 1 : auction?.startPrice || 1)); }
                }}
                className={`rounded-xl border-2 p-1.5 min-h-16 text-center transition ${
                  mine ? 'border-teal-500 bg-teal-50'
                    : priorityChoice ? 'border-amber-300 bg-amber-50 animate-pulse cursor-pointer hover:scale-105'
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
                  <div className="text-xs text-gray-300">{priorityChoice ? '선택 가능' : auctionable ? '입찰 가능' : '빈 자리'}</div>
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
            <div className="text-xs text-gray-400 text-center mb-3">
              입찰금 {fmt(Math.floor(Number(amount) || 0))} + 예상 세금 {fmt(taxForPart(Math.floor(Number(amount) || 0), klass, 'seat').tax)} {klass.currency}
            </div>
            <button onClick={placeBid} className="w-full rounded-2xl py-3 bg-rose-500 hover:bg-rose-600 text-white text-lg">
              입찰하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
