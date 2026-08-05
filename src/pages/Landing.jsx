import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import {
  collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { useApp } from '../context/AppContext';
import { isActiveStudent } from '../lib/studentState';

export default function Landing() {
  const navigate = useNavigate();
  const { teacher, session, saveSession } = useApp();
  const [params] = useSearchParams();
  // 선생님이 만든 초대 QR/링크로 들어오면 학급 코드가 미리 채워져요
  const invitedCode = (params.get('code') || '').trim().toUpperCase().slice(0, 6);
  const [code, setCode] = useState(invitedCode);
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const teacherLogin = async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/teacher');
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') setError('로그인에 실패했어요: ' + e.message);
    }
  };

  const studentJoin = async (e) => {
    e.preventDefault();
    setError('');
    const c = code.trim().toUpperCase();
    const n = name.trim();
    const p = pin.trim();
    if (!c || !n) return setError('학급 코드와 이름을 모두 입력해 주세요.');
    if (p.length !== 4) return setError('비밀번호는 숫자 4자리로 입력해 주세요. 🔒');
    setBusy(true);
    try {
      const classSnap = await getDocs(query(collection(db, 'classes'), where('code', '==', c)));
      if (classSnap.empty) {
        setError('학급 코드를 찾을 수 없어요. 선생님께 다시 확인해 보세요!');
        return;
      }
      const classDoc = classSnap.docs[0];
      const studentsRef = collection(db, 'classes', classDoc.id, 'students');
      const stSnap = await getDocs(query(studentsRef, where('name', '==', n)));
      const existingStudent = stSnap.docs.find((d) => isActiveStudent(d.data()));
      let studentId;

      if (existingStudent) {
        // 이미 있는 학생 — 비밀번호가 맞아야 들어갈 수 있어요
        const docSnap = existingStudent;
        const saved = String(docSnap.data().pin || '');
        if (saved && saved !== p) {
          setError('비밀번호가 달라요. 처음 정한 4자리를 입력해 주세요! 🔒 (잊었다면 선생님께 말씀드리세요)');
          return;
        }
        // 예전에 만들어진 학생은 이번에 입력한 번호를 비밀번호로 저장해요
        if (!saved) await updateDoc(docSnap.ref, { pin: p });
        studentId = docSnap.id;
      } else {
        const created = await addDoc(studentsRef, {
          pin: p, // 처음 입장할 때 정한 나만의 비밀번호
          name: n,
          cash: 0,
          krw: 0,
          usd: 0,
          deposit: 0,
          depositLastAt: Date.now(),
          avatar: { base: null, hat: null, face: null, acc: null }, // 캐릭터는 상점에서 사요
          inventory: [],
          room: {},
          garden: {},
          classroom: {},
          cafe: {},
          walking: [],
          jobId: null,
          jobSalary: 0,
          roomLikes: [],
          holdings: {},
          createdAt: serverTimestamp(),
        });
        studentId = created.id;
      }
      saveSession({ classId: classDoc.id, studentId, name: n, className: classDoc.data().name });
      navigate('/student');
    } catch (e2) {
      setError('입장 중 문제가 생겼어요: ' + e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <div className="text-7xl mb-3">🏦</div>
        <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
          <h1 className="text-4xl sm:text-5xl text-indigo-700">우리 반 경제나라</h1>
          <span className="text-sm text-gray-400">made by</span>
          <a
            href="https://moonsunezipbrand.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border-2 border-purple-200 bg-white px-3 py-1 text-sm text-purple-600 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-400 hover:bg-purple-50"
          >
            문수네집
          </a>
        </div>
        <p className="text-gray-500 text-lg">벌고, 모으고, 투자하고, 꾸미는 학급 경제 놀이터</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <a
            href="https://moonsunezipbrand.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border-2 border-purple-200 bg-white/90 px-4 py-2 text-sm text-purple-600 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-400 hover:bg-purple-50"
          >
            🏠 문수네집
          </a>
          <a
            href="https://www.instagram.com/moonsune.zip/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border-2 border-pink-200 bg-white/90 px-4 py-2 text-sm text-pink-600 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-400 hover:bg-pink-50"
          >
            📷 Instagram
          </a>
          <a
            href="https://moonsunezip.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border-2 border-sky-200 bg-white/90 px-4 py-2 text-sm text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50"
          >
            🌐 moonsune.zip
          </a>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* 학생 입장 */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border-4 border-yellow-200">
          <h2 className="text-2xl text-amber-600 mb-1">🧑‍🎓 학생 입장</h2>
          <p className="text-gray-400 text-sm mb-5">
            {invitedCode ? '학급 코드가 채워졌어요! 이름과 비밀번호만 쓰면 돼요' : '선생님이 알려준 학급 코드로 들어와요'}
            <br />
            <span className="text-amber-500">🔒 비밀번호는 처음 입장할 때 내가 정해요. 꼭 기억하세요!</span>
          </p>
          <form onSubmit={studentJoin} className="space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="학급 코드 (예: AB12CD)"
              maxLength={6}
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg tracking-widest uppercase focus:border-amber-400 outline-none"
            />
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="나만의 비밀번호 4자리 🔒"
              inputMode="numeric"
              maxLength={4}
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg tracking-[0.4em] text-center focus:border-amber-400 outline-none"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="내 이름 (또는 번호+이름)"
              autoFocus={!!invitedCode}
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-amber-400 outline-none"
            />
            <button
              disabled={busy}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-white rounded-2xl py-3 text-xl shadow transition"
            >
              {busy ? '입장 중...' : '🎒 교실 입장하기'}
            </button>
          </form>
          {session && (
            <button
              onClick={() => navigate('/student')}
              className="mt-3 w-full text-sm text-amber-600 underline"
            >
              {session.name}(으)로 이어서 하기 →
            </button>
          )}
        </div>

        {/* 교사 로그인 */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border-4 border-indigo-200 flex flex-col">
          <h2 className="text-2xl text-indigo-600 mb-1">👩‍🏫 선생님 로그인</h2>
          <p className="text-gray-400 text-sm mb-5">구글 계정으로 로그인하고 학급을 관리해요</p>
          <button
            onClick={teacherLogin}
            className="w-full bg-white border-2 border-gray-300 hover:border-indigo-400 rounded-2xl py-3 text-lg flex items-center justify-center gap-3 shadow-sm transition"
          >
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 35.3 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
            구글 계정으로 로그인
          </button>
          {teacher && (
            <button
              onClick={() => navigate('/teacher')}
              className="mt-3 w-full text-sm text-indigo-600 underline"
            >
              {teacher.displayName} 선생님 대시보드로 →
            </button>
          )}
          <div className="mt-auto pt-6 text-xs text-gray-400 leading-relaxed">
            선생님은 학급 코드를 만들고 화폐·월급·상점·이율을 관리할 수 있어요.
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl px-6 py-3">
          {error}
        </div>
      )}
    </div>
  );
}
