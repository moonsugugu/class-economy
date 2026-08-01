import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { fmt } from '../../lib/util';

const NAV = [
  ['/student', '🏠', '마이', true],
  ['/student/shop', '🏪', '상점'],
  ['/student/bank', '🏦', '은행'],
  ['/student/stocks', '📈', '주식'],
  ['/student/class', '🏛️', '학급'],
  ['/student/seats', '🪑', '자리'],
  ['/student/room', '🛋️', '내방'],
  ['/student/visit', '🏠', '놀러가기'],
];

export default function StudentLayout() {
  const navigate = useNavigate();
  const { session, saveSession } = useApp();
  const [klass, setKlass] = useState(null);
  const [student, setStudent] = useState(null);
  const [gone, setGone] = useState(false);

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

  useEffect(() => {
    if (!session || gone) {
      saveSession(null);
      navigate('/', { replace: true });
    }
  }, [gone]);

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
        <div className="ml-auto bg-white/20 backdrop-blur rounded-2xl px-4 py-2 tabular-nums relative">
          💰 {fmt(student.cash)} <span className="text-xs">{klass.currency}</span>
        </div>
        <button
          onClick={() => { saveSession(null); navigate('/'); }}
          className="text-xs text-white/60 underline relative"
        >
          나가기
        </button>
      </header>

      <main className="px-4">
        <Outlet context={{ klass, student, session }} />
      </main>

      <nav className="fixed bottom-3 inset-x-0 px-3 z-40">
        <div className="max-w-3xl mx-auto flex bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-purple-100 p-1.5">
          {NAV.map(([to, icon, label, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 py-1.5 text-center rounded-2xl transition ${
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
    </div>
  );
}
