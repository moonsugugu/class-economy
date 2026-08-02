import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { MARKET_PATH, DEFAULT_FX, DEFAULT_KRW_PER_UNIT } from '../../lib/stocks';
import { ensureBaselines } from '../../lib/marketSync';
import AvatarView from '../../components/AvatarView';

export default function MyPage() {
  const { klass, student } = useOutletContext();
  const [savings, setSavings] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [fx, setFx] = useState(DEFAULT_FX);

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
      setStocks((data?.stocks || []).map((s) => ({ id: s.symbol, ...s })));
      setFx(data?.fx || DEFAULT_FX);
    });
  }, [klass.id]);

  // 랭킹용 기준값(오늘·이번주·이번달 시작 자산) 기록 — 기간이 바뀔 때만 저장돼요
  useEffect(() => {
    if (stocks.length) ensureBaselines(klass.id, student, stocks, fx, klass.krwPerUnit);
  }, [stocks.length, fx, student.id, klass.krwPerUnit]);

  const savingsSum = savings.reduce((a, s) => a + s.amount, 0);
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
  const total = Math.round(
    (student.cash || 0) + (student.deposit || 0) + savingsSum + stockValue + krwValue + usdValue
  );

  const Item = ({ icon, label, value, to, grad, sub }) => (
    <Link
      to={to}
      className={`rounded-3xl shadow-md p-5 flex items-center gap-4 hover:scale-[1.03] hover:shadow-lg transition bg-gradient-to-br ${grad}`}
    >
      <span className="text-4xl drop-shadow-sm">{icon}</span>
      <div className="flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-2xl tabular-nums text-gray-800">{fmt(value)} <span className="text-sm text-gray-500">{klass.currency}</span></div>
        {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
      </div>
      <span className="text-gray-400/60 text-xl">›</span>
    </Link>
  );

  const share = total > 0 ? Math.round(((student.cash || 0) / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 총자산 히어로 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-3xl shadow-xl p-6 text-white flex items-center gap-5">
        <span className="absolute right-4 top-3 text-2xl animate-pulse select-none">✨</span>
        <span className="absolute right-14 bottom-4 text-lg opacity-60 select-none">💫</span>
        <span className="absolute -left-4 -bottom-6 text-7xl opacity-15 select-none">💰</span>
        <div className="bg-white/15 backdrop-blur rounded-full p-2 shadow-inner">
          <AvatarView avatar={student.avatar} size={72} />
        </div>
        <div className="relative">
          <div className="text-sm text-white/70">{student.name}의 총자산 🏆</div>
          <div className="text-4xl tabular-nums drop-shadow">{fmt(total)} <span className="text-lg">{klass.currency}</span></div>
          <div className="text-[11px] text-white/60 mt-1">현금 비중 {share}% · 예금·적금·주식까지 모두 더한 금액이에요</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Item icon="💵" label="현금" value={student.cash} to="/student/shop" grad="from-amber-50 to-orange-100" sub="상점에서 바로 쓸 수 있어요" />
        <Item icon="🏦" label="예금" value={student.deposit} to="/student/bank" grad="from-emerald-50 to-teal-100" sub={`7일마다 ${klass.depositRate}% 이자`} />
        <Item icon="🐷" label="적금 (모으는 중)" value={savingsSum} to="/student/bank" grad="from-pink-50 to-rose-100" sub={`만기까지 기다리면 ${klass.savingsRate}% 이자`} />
        <Item icon="📈" label="주식 평가액" value={stockValue} to="/student/stocks" grad="from-sky-50 to-blue-100" sub="시세에 따라 오르락내리락!" />
        <Item
          icon="🇰🇷" label={`원화 (${fmt(student.krw || 0)}원)`} value={krwValue} to="/student/bank"
          grad="from-sky-50 to-cyan-100" sub={`1 ${klass.currency} = ${fmt(kpu)}원`}
        />
        <Item
          icon="🇺🇸" label={`달러 ($${fmt(student.usd || 0)})`} value={usdValue} to="/student/bank"
          grad="from-lime-50 to-emerald-100" sub={`1달러 = ${fmt(fx)}원`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/student/room" className="rounded-3xl bg-gradient-to-br from-purple-100 to-fuchsia-100 shadow-md p-4 text-center hover:scale-[1.03] transition">
          <div className="text-3xl mb-1">🛋️🌳</div>
          <div className="text-purple-700">마이룸 & 정원 꾸미기</div>
          <div className="text-[11px] text-purple-400">3D 방과 정원을 꾸며 보세요!</div>
        </Link>
        <Link to="/student/visit" className="rounded-3xl bg-gradient-to-br from-pink-100 to-rose-100 shadow-md p-4 text-center hover:scale-[1.03] transition">
          <div className="text-3xl mb-1">🏠✍️</div>
          <div className="text-pink-700">친구 방 놀러가기</div>
          <div className="text-[11px] text-pink-500">구경하고 방명록 남기기!</div>
        </Link>
      </div>

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
