import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, runTransaction, where } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';

const remainingLabel = (deadlineAt, now) => {
  const left = Math.max(0, Number(deadlineAt) - now);
  if (!left) return '시간 종료';
  const seconds = Math.ceil(left / 1000);
  if (seconds < 60) return `${seconds}초 남음`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}분 남음`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분 남음` : `${hours}시간 남음`;
};

const dateLabel = (value) => value ? new Date(value).toLocaleString('ko-KR', {
  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '-';

export default function MissionsPage() {
  const { klass, student } = useOutletContext();
  const [missions, setMissions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'missions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setMissions(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
  }, [klass.id]);

  useEffect(() => {
    const q = query(
      collection(db, 'classes', klass.id, 'missionSubmissions'),
      where('studentId', '==', student.id)
    );
    return onSnapshot(q, (snap) => setSubmissions(
      snap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => (Number(b.submittedAt) || 0) - (Number(a.submittedAt) || 0))
    ));
  }, [klass.id, student.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const submissionByMission = useMemo(() => new Map(submissions.map((item) => [item.missionId, item])), [submissions]);

  const flash = (text) => {
    setMsg(text);
    window.setTimeout(() => setMsg(''), 3500);
  };

  const complete = async (mission) => {
    if (busy) return;
    const submissionId = `${mission.id}_${student.id}`;
    setBusy(mission.id);
    try {
      await runTransaction(db, async (tx) => {
        const missionRef = doc(db, 'classes', klass.id, 'missions', mission.id);
        const submissionRef = doc(db, 'classes', klass.id, 'missionSubmissions', submissionId);
        const missionSnap = await tx.get(missionRef);
        const submissionSnap = await tx.get(submissionRef);
        if (!missionSnap.exists()) throw new Error('미션을 찾지 못했어요.');
        const current = missionSnap.data() || {};
        if (current.status !== 'active') throw new Error('종료된 미션이에요.');
        if (Date.now() >= Number(current.deadlineAt)) throw new Error('제한 시간이 끝났어요.');
        if (submissionSnap.exists()) throw new Error('이미 완료 버튼을 눌렀어요. 선생님 확인을 기다려 주세요.');
        tx.set(submissionRef, {
          missionId: mission.id,
          studentId: student.id,
          studentName: student.name,
          status: 'submitted',
          submittedAt: Date.now(),
        });
      });
      flash('완료를 제출했어요. 선생님 확인 후 상금이 지급됩니다!');
    } catch (error) {
      flash(error.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 p-5 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎯</span>
          <div>
            <h1 className="text-2xl font-bold">오늘의 미션</h1>
            <p className="text-sm text-white/80">미션을 수행한 뒤 제한 시간 안에 완료 버튼을 눌러 주세요.</p>
          </div>
        </div>
      </section>

      {missions.map((mission) => {
        const submission = submissionByMission.get(mission.id);
        const expired = Number(mission.deadlineAt) <= now;
        const closed = mission.status === 'closed';
        const canComplete = !submission && !expired && !closed;
        return (
          <section key={mission.id} className={`rounded-3xl bg-white p-5 shadow-md border-2 ${canComplete ? 'border-indigo-100' : 'border-gray-100'}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-800">{mission.title}</h2>
                  {submission?.status === 'approved' && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">상금 지급 완료</span>}
                  {submission?.status === 'submitted' && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">확인 대기 중</span>}
                  {!submission && expired && <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-600">시간 종료</span>}
                  {!submission && closed && <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500">종료</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{mission.description}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
                  <span>🎁 상금 {fmt(mission.reward || 0)} {klass.currency}</span>
                  <span className={expired || closed ? 'text-rose-500' : 'text-indigo-500'}>⏱️ {closed ? '미션 종료' : remainingLabel(mission.deadlineAt, now)}</span>
                  <span>마감 {dateLabel(mission.deadlineAt)}</span>
                </div>
              </div>
              <button onClick={() => complete(mission)} disabled={!canComplete || busy === mission.id} className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-bold shadow ${canComplete ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'cursor-not-allowed bg-gray-100 text-gray-400'}`}>
                {busy === mission.id ? '제출 중…' : submission ? (submission.status === 'approved' ? '지급 완료' : '확인 대기') : expired || closed ? '제출 불가' : '완료했어요'}
              </button>
            </div>
          </section>
        );
      })}
      {!missions.length && <div className="rounded-3xl bg-white p-8 text-center text-gray-400 shadow">선생님이 아직 오늘의 미션을 등록하지 않았어요.</div>}
      {msg && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-xl">{msg}</div>}
    </div>
  );
}
