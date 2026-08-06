import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { fmt, netAssets } from '../../lib/util';
import { MARKET_PATH, DEFAULT_FX, DEFAULT_KRW_PER_UNIT } from '../../lib/stocks';
import { activeEconomyEvents, eventEffectSummary } from '../../lib/economyEvents.js';
import FeatureGuideModal from '../../components/FeatureGuideModal.jsx';

const NAV = [
  ['/student', '🏠', '마이', true],
  ['/student/shop', '🏪', '상점'],
  ['/student/bank', '🏦', '은행'],
  ['/student/stocks', '📈', '주식'],
  ['/student/missions', '🎯', '오늘 미션'],
  ['/student/payment-request', '🧾', '지급요청'],
  ['/student/lottery', '🎟️', '복권'],
  ['/student/class', '🏛️', '학급'],
  ['/student/seats', '🪑', '자리'],
  ['/student/room', '🛋️', '내 공간'],
  ['/student/visit', '🏠', '놀러가기'],
  ['/student/hero', '⚔️', '용사키우기'],
  ['/student/hero/duel', '🥊', '친구 대결'],
];

export default function StudentLayout() {
  const navigate = useNavigate();
  const { session, saveSession } = useApp();
  const [klass, setKlass] = useState(null);
  const [student, setStudent] = useState(null);
  const [gone, setGone] = useState(false);
  const [market, setMarket] = useState(null);
  const [savings, setSavings] = useState([]);
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    if (!session) return;
    const unsub1 = onSnapshot(doc(db, 'classes', session.classId), (snap) => {
      if (!snap.exists()) setGone(true);
      else setKlass({ id: snap.id, ...snap.data() });
    });
    const unsub2 = onSnapshot(
      doc(db, 'classes', session.classId, 'students', session.studentId),
      (snap) => {
        if (!snap.exists()) setGone(true);
        else setStudent({ id: snap.id, ...snap.data() });
      }
    );
    return () => { unsub1(); unsub2(); };
  }, [session?.classId, session?.studentId]);

  // 헤더에 총자산을 보여주기 위해 시세와 적금도 함께 봐요
  useEffect(() => {
    if (!session) return;
    return onSnapshot(doc(db, ...MARKET_PATH(session.classId)), (s) =>
      setMarket(s.exists() ? s.data() : null)
    );
  }, [session?.classId]);

  useEffect(() => {
    if (!session) return;
    const q = query(
      collection(db, 'classes', session.classId, 'accounts'),
      where('studentId', '==', session.studentId),
      where('status', '==', 'active')
    );
    return onSnapshot(q, (s) => setSavings(s.docs.map((d) => d.data())));
  }, [session?.classId, session?.studentId]);

  useEffect(() => {
    if (!session) return;
    const q = query(
      collection(db, 'classes', session.classId, 'loans'),
      where('studentId', '==', session.studentId)
    );
    return onSnapshot(q, (s) => setLoans(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [session?.classId, session?.studentId]);

  useEffect(() => {
    if (!session || gone) {
      saveSession(null);
      navigate('/', { replace: true });
    }
  }, [gone]);

  // 총자산 = 현금 + 예금 + 적금 + 달러 + 주식 평가액
  const fx = market?.fx || DEFAULT_FX;
  const stockList = market?.stocks || [];
  const kpu = Number(klass?.krwPerUnit) || DEFAULT_KRW_PER_UNIT;
  const totalAssets = student ? netAssets(student, stockList, fx, kpu, savings, loans) : 0;
  const currentEvents = activeEconomyEvents(klass || {});

  if (!session) return null;
  if (!klass || !student) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-gray-400">교실에 들어가는 중...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto min-h-screen pb-28">
      <header className="m-3 mb-4 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400 text-white shadow-lg px-5 py-3 flex items-center gap-3 relative overflow-hidden">
        <span className="absolute -right-3 -top-4 text-6xl opacity-20 select-none">🏫</span>
        <span className="text-3xl drop-shadow">{student.avatar?.base || '🙂'}</span>
        <div className="leading-tight">
          <div className="text-lg">{student.name}</div>
          <div className="text-xs text-white/70">🏫 {klass.name}</div>
        </div>
        <div className="ml-auto bg-white/20 backdrop-blur rounded-2xl px-4 py-1.5 relative text-right leading-tight">
          <div className="text-[10px] text-white/70">🏆 총자산</div>
          <div className="tabular-nums">{fmt(Math.floor(Number(totalAssets) || 0))} <span className="text-xs">{klass.currency}</span></div>
        </div>
        <button
          onClick={() => { saveSession(null); navigate('/'); }}
          className="text-xs text-white/60 underline relative"
        >
          나가기
        </button>
      </header>

      {currentEvents.length > 0 && (
        <div className="mx-3 mb-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold">
            <span className="relative z-10 shrink-0 rounded-full bg-amber-400 px-2 py-1 text-white shadow-sm">📢 이벤트 발생</span>
            <div className="relative min-w-0 flex-1 overflow-hidden whitespace-nowrap">
              <div className="event-ticker-track">
                {currentEvents.map((event) => (
                  <span key={`${event.id}-${event.at || ''}`} className="mr-8">
                    <b>{event.title}</b> · {event.description} · <strong className="text-amber-700">효과: {eventEffectSummary(event)}</strong>
                    {Number(event.multiplier) > 1 && <em className="ml-2 not-italic">({event.multiplier}배 적용)</em>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="px-4">
        <Outlet context={{ klass, student, session, loans, savings, market }} />
      </main>

      <nav className="fixed bottom-3 inset-x-0 px-3 z-40">
        <div className="max-w-3xl mx-auto flex overflow-x-auto bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-purple-100 p-1.5">
          {NAV.map(([to, icon, label, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `min-w-[58px] flex-none py-1.5 text-center rounded-2xl transition ${
                  isActive ? 'bg-gradient-to-b from-indigo-500 to-purple-500 text-white shadow' : 'text-gray-400 hover:bg-purple-50'
                }`
              }
            >
              <div className="text-xl leading-none pt-1">{icon}</div>
              <div className="text-[10px] pb-0.5 leading-tight">{label}</div>
            </NavLink>
          ))}
        </div>
      </nav>
      <FeatureGuideModal role="student" />
    </div>
  );
}
