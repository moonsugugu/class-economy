import { useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, doc, onSnapshot, orderBy, query, runTransaction, updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';

const missionPath = (classId) => collection(db, 'classes', classId, 'missions');
const submissionPath = (classId) => collection(db, 'classes', classId, 'missionSubmissions');

const remainingLabel = (deadlineAt, now) => {
  const left = Math.max(0, Number(deadlineAt) - now);
  if (!left) return '시간 종료';
  const minutes = Math.ceil(left / 60000);
  if (minutes < 60) return `${minutes}분 남음`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분 남음` : `${hours}시간 남음`;
};

const dateLabel = (value) => value ? new Date(value).toLocaleString('ko-KR', {
  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '-';

export default function MissionsTab({ klass }) {
  const [missions, setMissions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [form, setForm] = useState({ title: '', description: '', minutes: '60', reward: '20' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const q = query(missionPath(klass.id), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setMissions(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
  }, [klass.id]);

  useEffect(() => {
    const q = query(submissionPath(klass.id), orderBy('submittedAt', 'desc'));
    return onSnapshot(q, (snap) => setSubmissions(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
  }, [klass.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const submissionsByMission = useMemo(() => submissions.reduce((map, item) => {
    const list = map.get(item.missionId) || [];
    list.push(item);
    map.set(item.missionId, list);
    return map;
  }, new Map()), [submissions]);

  const flash = (text) => {
    setMsg(text);
    window.setTimeout(() => setMsg(''), 4000);
  };

  const createMission = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    const minutes = Math.max(1, Math.floor(Number(form.minutes) || 0));
    const reward = Math.max(0, Math.floor(Number(form.reward) || 0));
    if (!title) return flash('미션 제목을 입력해 주세요.');
    if (!description) return flash('미션 내용을 입력해 주세요.');
    setBusy('create');
    try {
      const startedAt = Date.now();
      await addDoc(missionPath(klass.id), {
        title,
        description,
        reward,
        startedAt,
        deadlineAt: startedAt + minutes * 60000,
        status: 'active',
        createdAt: startedAt,
      });
      setForm({ title: '', description: '', minutes: '60', reward: '20' });
      flash('오늘의 미션을 등록했습니다.');
    } catch (error) {
      flash(`미션 등록 실패: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const extendMission = async (mission) => {
    const answer = window.prompt('추가할 시간을 분 단위로 입력해 주세요.', '10');
    const minutes = Math.floor(Number(answer));
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    setBusy(`extend-${mission.id}`);
    try {
      const deadlineAt = Math.max(Date.now(), Number(mission.deadlineAt) || 0) + minutes * 60000;
      await updateDoc(doc(db, 'classes', klass.id, 'missions', mission.id), { deadlineAt, status: 'active', updatedAt: Date.now() });
      flash(`${mission.title} 미션에 ${minutes}분을 추가했습니다.`);
    } catch (error) {
      flash(`추가 시간 설정 실패: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const closeMission = async (mission) => {
    if (!window.confirm(`「${mission.title}」 미션을 종료할까요? 아직 제출하지 않은 학생은 완료할 수 없게 됩니다.`)) return;
    setBusy(`close-${mission.id}`);
    try {
      await updateDoc(doc(db, 'classes', klass.id, 'missions', mission.id), { status: 'closed', updatedAt: Date.now() });
      flash('미션을 종료했습니다.');
    } catch (error) {
      flash(`미션 종료 실패: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const approveSubmission = async (submission) => {
    if (submission.status !== 'submitted') return;
    setBusy(`approve-${submission.id}`);
    let paidReward = 0;
    try {
      await runTransaction(db, async (tx) => {
        const submissionRef = doc(db, 'classes', klass.id, 'missionSubmissions', submission.id);
        const missionRef = doc(db, 'classes', klass.id, 'missions', submission.missionId);
        const studentRef = doc(db, 'classes', klass.id, 'students', submission.studentId);
        const submissionSnap = await tx.get(submissionRef);
        const missionSnap = await tx.get(missionRef);
        const studentSnap = await tx.get(studentRef);
        if (!submissionSnap.exists()) throw new Error('학생의 완료 기록을 찾지 못했어요.');
        if (submissionSnap.data()?.status !== 'submitted') throw new Error('이미 처리된 완료 기록입니다.');
        if (!missionSnap.exists()) throw new Error('미션이 삭제되었어요.');
        if (!studentSnap.exists()) throw new Error('학생 정보를 찾지 못했어요.');
        const reward = Math.max(0, Math.floor(Number(missionSnap.data()?.reward) || 0));
        paidReward = reward;
        const student = studentSnap.data() || {};
        tx.update(studentRef, { cash: (Number(student.cash) || 0) + reward });
        tx.update(submissionRef, { status: 'approved', rewardPaid: reward, approvedAt: Date.now() });
      });
      flash(`${submission.studentName || '학생'}에게 미션 상금 ${fmt(paidReward)}을 지급했습니다.`);
    } catch (error) {
      flash(`상금 지급 실패: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-3xl shadow p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-3xl">🎯</div>
          <div>
            <h2 className="text-xl font-bold text-indigo-700">오늘의 미션</h2>
            <p className="text-sm text-gray-500 mt-1">미션을 만들고 제한 시간과 상금을 정해 주세요. 학생이 완료를 누르면 선생님 확인 뒤 상금이 지급됩니다.</p>
          </div>
        </div>
        <form onSubmit={createMission} className="grid gap-3 md:grid-cols-2">
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="미션 제목 (예: 오늘의 경제 퀴즈)" className="rounded-xl border-2 border-gray-200 px-3 py-2 outline-none focus:border-indigo-400" />
          <input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="미션 내용과 완료 조건" className="rounded-xl border-2 border-gray-200 px-3 py-2 outline-none focus:border-indigo-400" />
          <label className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
            제한 시간
            <input type="number" min="1" value={form.minutes} onChange={(e) => setForm((prev) => ({ ...prev, minutes: e.target.value }))} className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right" /> 분
          </label>
          <label className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
            성공 상금
            <input type="number" min="0" value={form.reward} onChange={(e) => setForm((prev) => ({ ...prev, reward: e.target.value }))} className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right" /> {klass.currency}
          </label>
          <button type="submit" disabled={busy === 'create'} className="md:col-span-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 font-bold text-white shadow disabled:opacity-40">{busy === 'create' ? '등록 중…' : '➕ 오늘의 미션 등록'}</button>
        </form>
      </section>

      {missions.map((mission) => {
        const missionSubmissions = submissionsByMission.get(mission.id) || [];
        const expired = Number(mission.deadlineAt) <= now;
        const closed = mission.status === 'closed';
        return (
          <section key={mission.id} className={`rounded-3xl bg-white shadow p-5 border-2 ${closed || expired ? 'border-gray-100' : 'border-indigo-100'}`}>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-gray-800">{mission.title}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${closed ? 'bg-gray-100 text-gray-500' : expired ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>{closed ? '종료' : expired ? '시간 종료' : '진행 중'}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{mission.description}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                  <span>🎁 상금 {fmt(mission.reward || 0)} {klass.currency}</span>
                  <span>⏱️ {expired ? '시간 종료' : remainingLabel(mission.deadlineAt, now)}</span>
                  <span>마감 {dateLabel(mission.deadlineAt)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {!closed && expired && <button onClick={() => extendMission(mission)} disabled={busy === `extend-${mission.id}`} className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700 disabled:opacity-40">⏱️ 추가 시간</button>}
                {!closed && <button onClick={() => closeMission(mission)} disabled={busy === `close-${mission.id}`} className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 disabled:opacity-40">종료</button>}
              </div>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-3">
              <div className="mb-2 text-sm font-bold text-gray-600">학생 완료 현황 {missionSubmissions.length}명</div>
              {missionSubmissions.length ? (
                <div className="space-y-2">
                  {missionSubmissions.map((submission) => (
                    <div key={submission.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                      <span className="text-lg">{submission.status === 'approved' ? '✅' : '📝'}</span>
                      <span className="flex-1"><b>{submission.studentName || '학생'}</b><span className="ml-2 text-xs text-gray-400">{dateLabel(submission.submittedAt)}</span></span>
                      {submission.status === 'approved' ? <span className="text-xs font-bold text-emerald-600">상금 지급 완료</span> : <button onClick={() => approveSubmission(submission)} disabled={busy === `approve-${submission.id}`} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">확인하고 {fmt(mission.reward || 0)} 지급</button>}
                    </div>
                  ))}
                </div>
              ) : <div className="rounded-xl bg-gray-50 px-3 py-4 text-center text-sm text-gray-400">아직 완료한 학생이 없습니다.</div>}
            </div>
          </section>
        );
      })}
      {!missions.length && <div className="rounded-3xl bg-white p-8 text-center text-gray-400 shadow">등록된 미션이 없습니다. 첫 미션을 만들어 보세요!</div>}
      {msg && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-xl">{msg}</div>}
    </div>
  );
}
