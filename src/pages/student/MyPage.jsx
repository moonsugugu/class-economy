import { useEffect, useRef, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { collection, doc, query, where, onSnapshot, runTransaction, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt, netAssets } from '../../lib/util';
import { MARKET_PATH, DEFAULT_FX, DEFAULT_KRW_PER_UNIT, mergeSeedStocks } from '../../lib/stocks';
import { ensureBaselines } from '../../lib/marketSync';
import AvatarView from '../../components/AvatarView';
import { PROFILE_ITEMS, PROFILE_SLOTS, normalizeProfileOwned } from '../../lib/profile';
import { itemPrice } from '../../lib/pricing';
import { TAX_LEDGER_ID, taxForPart } from '../../lib/taxes';
import { ITEM_MAP } from '../../lib/items';
import { HERO_ITEM_MAP, heroItemValue } from '../../lib/hero';
import { loanDueAmount } from '../../lib/loans.js';

export default function MyPage() {
  const { klass, student, loans: contextLoans = [] } = useOutletContext();
  const [savings, setSavings] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [fx, setFx] = useState(DEFAULT_FX);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileBusy, setProfileBusy] = useState(null);
  const profileRefundBusyRef = useRef(false);

  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const profileOwned = normalizeProfileOwned(student.profileOwned);

  const buyProfile = async (item) => {
    if (profileBusy) return;
    setProfileBusy(item.id);
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data() || {};
        const settings = { ...klass, ...((await tx.get(doc(db, 'classes', klass.id))).data() || {}) };
        const owned = normalizeProfileOwned(s.profileOwned);
        if (owned.includes(item.id)) throw new Error('이미 가지고 있는 프로필 아이템이에요.');
        const price = itemPrice(item.price, settings);
        const tax = taxForPart(price, settings, 'item').tax;
        const totalPrice = price + tax;
        if ((s.cash || 0) < totalPrice) throw new Error('현금이 부족해요.');
        const avatar = { ...(s.avatar || {}), base: item.value };
        tx.update(studentRef, {
          cash: (s.cash || 0) - totalPrice,
          profileOwned: [...owned, item.id],
          avatar,
        });
        if (tax > 0) {
          tx.set(doc(db, 'classes', klass.id, 'taxLedger', TAX_LEDGER_ID), {
            pending: increment(tax),
            item: increment(tax),
            updatedAt: Date.now(),
          }, { merge: true });
        }
      });
    } catch (e) {
      window.alert(e.message);
    } finally {
      setProfileBusy(null);
    }
  };

  const equipProfile = async (item) => {
    if (profileBusy) return;
    setProfileBusy(item.id);
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data() || {};
        const owned = normalizeProfileOwned(s.profileOwned);
        if (!owned.includes(item.id)) throw new Error('먼저 프로필 상점에서 구매해 주세요.');
        const avatar = { ...(s.avatar || {}), base: item.value };
        tx.update(studentRef, { avatar });
      });
    } catch (e) {
      window.alert(e.message);
    } finally {
      setProfileBusy(null);
    }
  };

  const refundProfile = async (item) => {
    if (profileBusy || profileRefundBusyRef.current) return;
    const refund = Math.floor(itemPrice(item.price, klass) * 0.5);
    if (!window.confirm(item.name + '을(를) ' + fmt(refund) + klass.currency + '에 환불할까요?')) return;
    profileRefundBusyRef.current = true;
    setProfileBusy(item.id);
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data() || {};
        const owned = normalizeProfileOwned(s.profileOwned);
        if (!owned.includes(item.id)) throw new Error('구매한 프로필 아이템이 아니에요.');
        const avatar = { ...(s.avatar || {}) };
        if (avatar.base === item.value || avatar.base === item.id) delete avatar.base;
        if (avatar[item.slot] === item.id) delete avatar[item.slot];
        tx.update(studentRef, {
          cash: (s.cash || 0) + refund,
          profileOwned: owned.filter((id) => id !== item.id),
          avatar,
        });
      });
    } catch (e) {
      window.alert(e.message);
    } finally {
      profileRefundBusyRef.current = false;
      setProfileBusy(null);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'classes', klass.id, 'accounts'),
      where('studentId', '==', student.id),
      where('status', '==', 'active')
    );
    return onSnapshot(q, (snap) => setSavings(snap.docs.map((d) => d.data())));
  }, [klass.id, student.id]);

  // 시장 전체가 문서 1개 — 읽기 비용 절약
  useEffect(() => {
    return onSnapshot(doc(db, ...MARKET_PATH(klass.id)), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      setStocks(mergeSeedStocks(data?.stocks || []).map((s) => ({ id: s.symbol, ...s })));
      setFx(data?.fx || DEFAULT_FX);
    });
  }, [klass.id]);

  // 랭킹용 기준값(오늘·이번주·이번달 시작 자산) 기록 — 기간이 바뀔 때만 저장돼요
  useEffect(() => {
    if (stocks.length) ensureBaselines(klass.id, student, stocks, fx, klass.krwPerUnit);
  }, [stocks.length, fx, student.id, klass.krwPerUnit]);

  const savingsSum = savings.reduce((a, s) => a + (Number(s.amount) || 0), 0);
  const kpu = Number(klass.krwPerUnit) || DEFAULT_KRW_PER_UNIT;
  // 한국 주식은 원, 미국 주식은 달러 → 모두 학급 화폐로 환산해서 합쳐요
  const conv = (amount, market) => {
    if (market === 'US') return (amount * fx) / kpu;
    if (market === 'KR') return amount / kpu;
    return amount;
  };
  const stockValue = Object.entries(student.holdings || {}).reduce((a, [sym, h]) => {
    const st = stocks.find((s) => s.id === sym);
    if (!st || !h.qty) return a;
    return a + conv(st.price * h.qty, st.market);
  }, 0);
  const krwValue = (student.krw || 0) / kpu;
  const usdValue = ((student.usd || 0) * fx) / kpu;
  const total = netAssets(student, stocks, fx, kpu, savings, contextLoans);
  const whole = (value) => fmt(Math.floor(Number(value) || 0));
  const loanBalance = contextLoans
    .filter((loan) => ['active', 'overdue'].includes(loan.status))
    .reduce((sum, loan) => sum + loanDueAmount(loan), 0);
  const spaceSpending = (student.inventory || []).reduce(
    (sum, itemId) => sum + (Number(ITEM_MAP[itemId]?.price) || 0),
    0
  );
  const heroItemSpending = (student.rpg?.owned || []).reduce(
    (sum, itemId) => sum + heroItemValue(HERO_ITEM_MAP[itemId], student.rpg),
    0
  );

  const share = total > 0 ? Math.round(((student.cash || 0) / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 총자산 히어로 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-3xl shadow-xl p-6 text-white flex items-center gap-5">
        <span className="absolute right-4 top-3 text-2xl animate-pulse select-none">✨</span>
        <span className="absolute right-14 bottom-4 text-lg opacity-60 select-none">💫</span>
        <span className="absolute -left-4 -bottom-6 text-7xl opacity-15 select-none">💰</span>
        <button
          type="button"
          onClick={() => setProfileOpen((open) => !open)}
          className="group rounded-full bg-white/15 p-2 text-left shadow-inner transition hover:scale-105 hover:bg-white/25"
          title="프로필 상점 열기"
        >
          <AvatarView avatar={student.avatar} size={72} />
          <span className="absolute left-6 top-20 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-indigo-600 opacity-0 shadow transition group-hover:opacity-100">
            프로필 상점
          </span>
        </button>
        <div className="relative">
          <div className="text-sm text-white/70">{student.name}의 총자산 🏆</div>
          <div className="text-4xl tabular-nums drop-shadow">{whole(total)} <span className="text-lg">{klass.currency}</span></div>
          <div className="text-[11px] text-white/60 mt-1">현금 비중 {share}% · 예금·적금·주식까지 모두 더한 금액이에요</div>
        </div>
      </div>

      {profileOpen && (
        <section className="rounded-3xl border-2 border-indigo-100 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center gap-3">
            <div>
              <h3 className="text-xl font-bold text-indigo-600">✨ 프로필 상점</h3>
              <p className="text-xs text-gray-400">동물·이모티콘 프로필 사진을 하나씩 구매해 사용할 수 있어요. 환불은 구매가의 50%예요.</p>
            </div>
            <button type="button" onClick={() => setProfileOpen(false)} className="ml-auto rounded-xl bg-gray-100 px-3 py-1 text-sm text-gray-500">닫기</button>
          </div>
          <div className="mb-4 rounded-2xl bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
            내 현금 <b>{fmt(student.cash)} {klass.currency}</b> · 구매한 프로필 {profileOwned.length}개
          </div>
          <div className="space-y-5">
            {PROFILE_SLOTS.map(([slot, label]) => (
              <div key={slot}>
                <h4 className="mb-2 text-sm font-bold text-gray-600">{label}</h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PROFILE_ITEMS.filter((item) => item.slot === slot).map((item) => {
                    const owned = profileOwned.includes(item.id);
                    const equipped = slot === 'base'
                      ? student.avatar?.base === item.value
                      : student.avatar?.[slot] === item.id;
                    const price = itemPrice(item.price, klass);
                    const tax = taxForPart(price, klass, 'item').tax;
                    const previewAvatar = { base: item.value };
                    return (
                      <div key={item.id} className={['rounded-2xl border p-2 text-center transition', equipped ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-100 bg-gray-50'].join(' ')}>
                        <div className="mx-auto mb-1 flex h-20 items-end justify-center rounded-xl bg-white">
                          <AvatarView avatar={previewAvatar} size={52} />
                        </div>
                        <div className="text-xs font-bold text-gray-600">{item.name}</div>
                        <div className="text-[10px] text-amber-600">{fmt(price + tax)} {klass.currency}</div>
                        {owned ? (
                          <div className="mt-1 space-y-1">
                            <button type="button" onClick={() => equipProfile(item)} disabled={!!profileBusy} className="w-full rounded-lg bg-indigo-100 py-1 text-[11px] text-indigo-600">
                              {equipped ? '사용 중 ✓' : '사용하기'}
                            </button>
                            <button type="button" onClick={() => refundProfile(item)} disabled={!!profileBusy} className="text-[10px] text-rose-500 underline">
                              50% 환불
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => buyProfile(item)} disabled={!!profileBusy || student.cash < price + tax} className="mt-1 w-full rounded-lg bg-amber-400 py-1 text-[11px] text-white disabled:bg-gray-300">
                            구매하기
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-white shadow-md border border-indigo-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📋</span>
          <h3 className="font-bold text-indigo-700">자산 내역</h3>
          <span className="ml-auto text-[11px] text-gray-400">모든 금액은 소수점 없이 표시</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8">
          {[
            ['💵', '현금', student.cash, '/student/shop'],
            ['🏦', '예금', student.deposit, '/student/bank'],
            ['🐷', '적금', savingsSum, '/student/bank'],
            ['📈', '주식 평가액', stockValue, '/student/stocks'],
            ['🇰🇷', `원화 (${whole(student.krw || 0)}원)`, krwValue, '/student/bank'],
            ['🇺🇸', `달러 ($${whole(student.usd || 0)})`, usdValue, '/student/bank'],
            ['💳', '대출 잔액', loanBalance, '/student/bank', 'text-rose-600'],
            ['🛋️', '공간 지출비', spaceSpending, '/student/room', 'text-purple-600'],
            ['⚔️', '용사 아이템비', heroItemSpending, '/student/hero', 'text-violet-600'],
          ].map(([icon, label, value, to, tone]) => (
            <Link key={label} to={to} className="flex items-center gap-2 border-b border-gray-100 py-3 hover:bg-indigo-50/60 rounded-xl px-2 transition">
              <span className="text-xl">{icon}</span>
              <span className="flex-1 text-sm text-gray-600">{label}</span>
              <span className={`tabular-nums font-semibold ${tone || 'text-gray-800'}`}>{whole(value)} {klass.currency}</span>
              <span className="text-gray-300">›</span>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
          <span>예금 이율 {klass.depositRate}%</span>
          <span>적금 이율 {klass.savingsRate}%</span>
          <span>1 {klass.currency} = {whole(kpu)}원</span>
          <span>1달러 = {whole(fx)}원</span>
        </div>
      </section>

      {student.jobName && (
        <div className="rounded-3xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md p-4 flex items-center gap-3">
          <span className="text-3xl">{student.jobEmoji}</span>
          <div className="flex-1">
            <div className="text-xs text-white/70">내 직업</div>
            <div className="text-lg">{student.jobName}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/70">직업 수당</div>
            <div className="text-lg tabular-nums">+{fmt(student.jobSalary || 0)}</div>
          </div>
        </div>
      )}

      <Link
        to="/student/report"
        className="block rounded-3xl bg-white shadow-md p-4 text-center hover:scale-[1.02] transition"
      >
        <span className="text-xl">🐞</span>{' '}
        <span className="text-gray-600">이상한 점이나 좋은 생각이 있나요?</span>{' '}
        <span className="text-rose-500 underline">버그 신고 · 건의함 →</span>
      </Link>
    </div>
  );
}
