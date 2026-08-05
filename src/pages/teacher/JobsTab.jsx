import { useEffect, useState } from 'react';
import {
  collection, doc, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, writeBatch, arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { JOB_PRESETS } from '../../lib/jobs';
import { isActiveStudent } from '../../lib/studentState';

const card = 'bg-white rounded-3xl shadow p-6';
const input = 'rounded-xl border-2 border-gray-200 px-3 py-2 focus:border-indigo-400 outline-none';
const btn = 'rounded-xl px-4 py-2 text-white shadow transition disabled:opacity-40';

export default function JobsTab({ klass }) {
  const [jobs, setJobs] = useState(null);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ emoji: '💼', name: '', salary: 50, slots: 1, desc: '' });
  const [msg, setMsg] = useState('');
  const [presetOpen, setPresetOpen] = useState(false);
  const [picked, setPicked] = useState(new Set());

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'jobs'), orderBy('createdAt'));
    return onSnapshot(q, (s) => setJobs(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'students'), orderBy('name'));
    return onSnapshot(q, (s) => setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent)));
  }, [klass.id]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };
  const nameOf = (id) => students.find((s) => s.id === id)?.name || '(나간 학생)';

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await addDoc(collection(db, 'classes', klass.id, 'jobs'), {
      emoji: form.emoji || '💼',
      name: form.name.trim(),
      salary: Number(form.salary) || 0,
      slots: Math.max(1, Number(form.slots) || 1),
      desc: form.desc.trim(),
      holders: [], applicants: [],
      createdAt: serverTimestamp(),
    });
    setForm({ emoji: '💼', name: '', salary: 50, slots: 1, desc: '' });
  };

  const addPresets = async () => {
    const batch = writeBatch(db);
    JOB_PRESETS.forEach((p, i) => {
      if (!picked.has(i)) return;
      batch.set(doc(collection(db, 'classes', klass.id, 'jobs')), {
        ...p, holders: [], applicants: [], createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
    setPresetOpen(false);
    flash(`✅ 직업 ${picked.size}개를 만들었어요!`);
  };

  const hire = async (job, sid) => {
    if ((job.holders || []).length >= job.slots) return flash('정원이 다 찼어요. 정원을 늘리거나 다른 학생을 해고해 주세요.');
    const batch = writeBatch(db);
    batch.update(doc(db, 'classes', klass.id, 'jobs', job.id), {
      holders: arrayUnion(sid), applicants: arrayRemove(sid),
    });
    batch.update(doc(db, 'classes', klass.id, 'students', sid), {
      jobId: job.id, jobName: job.name, jobEmoji: job.emoji, jobSalary: job.salary,
    });
    await batch.commit();
    flash(`🎉 ${nameOf(sid)} 학생을 ${job.name}(으)로 채용했어요!`);
  };

  const fire = async (job, sid) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'classes', klass.id, 'jobs', job.id), { holders: arrayRemove(sid) });
    batch.update(doc(db, 'classes', klass.id, 'students', sid), {
      jobId: null, jobName: null, jobEmoji: null, jobSalary: 0,
    });
    await batch.commit();
  };

  const reject = (job, sid) =>
    updateDoc(doc(db, 'classes', klass.id, 'jobs', job.id), { applicants: arrayRemove(sid) });

  const removeJob = async (job) => {
    if (!confirm(`'${job.name}' 직업을 없앨까요? 재직 중인 학생은 무직이 돼요.`)) return;
    const batch = writeBatch(db);
    (job.holders || []).forEach((sid) => {
      batch.update(doc(db, 'classes', klass.id, 'students', sid), {
        jobId: null, jobName: null, jobEmoji: null, jobSalary: 0,
      });
    });
    batch.delete(doc(db, 'classes', klass.id, 'jobs', job.id));
    await batch.commit();
  };

  if (!jobs) return <div className={card}>불러오는 중...</div>;

  const jobless = students.filter((s) => !s.jobId);
  const totalApplicants = jobs.reduce((a, j) => a + (j.applicants || []).length, 0);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-teal-100 to-emerald-100 rounded-3xl p-5 flex items-center gap-4 flex-wrap">
        <span className="text-4xl">🧑‍🍳</span>
        <div className="flex-1 min-w-40">
          <div className="text-teal-800">1인 1역을 "직업"으로 만들어 보세요</div>
          <div className="text-sm text-teal-700/70">
            직업이 있으면 월급 지급 때 <b>기본 월급 + 직업 수당</b>을 함께 받아요.
            {totalApplicants > 0 && <b className="text-rose-500"> · 지원자 {totalApplicants}명 대기 중!</b>}
          </div>
        </div>
        <button onClick={() => { setPicked(new Set(JOB_PRESETS.map((_, i) => i))); setPresetOpen(true); }} className={btn + ' bg-teal-500 hover:bg-teal-600'}>
          📋 직업 예시 담기
        </button>
      </div>

      {msg && <div className="bg-indigo-50 text-indigo-700 rounded-2xl px-4 py-3">{msg}</div>}

      {/* 직업 만들기 */}
      <form onSubmit={add} className={card + ' flex flex-wrap items-end gap-3'}>
        <div>
          <label className="text-xs text-gray-400 block">이모지</label>
          <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className={input + ' w-16 text-center text-xl'} />
        </div>
        <div className="flex-1 min-w-32">
          <label className="text-xs text-gray-400 block">직업 이름</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 은행원" className={input + ' w-full'} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block">직업 수당</label>
          <input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className={input + ' w-24'} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block">정원</label>
          <input type="number" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} className={input + ' w-20'} />
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-xs text-gray-400 block">하는 일 (선택)</label>
          <input value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} className={input + ' w-full'} />
        </div>
        <button className={btn + ' bg-teal-500 hover:bg-teal-600'}>+ 직업 만들기</button>
      </form>

      {/* 직업 목록 */}
      <div className="grid md:grid-cols-2 gap-3">
        {jobs.map((job) => {
          const holders = job.holders || [];
          const applicants = job.applicants || [];
          const full = holders.length >= job.slots;
          return (
            <div key={job.id} className="bg-white rounded-3xl shadow p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl">{job.emoji}</span>
                <div className="flex-1">
                  <div className="text-lg">{job.name}</div>
                  <div className="text-sm text-gray-400">
                    수당 {fmt(job.salary)} {klass.currency} · {holders.length}/{job.slots}명
                  </div>
                </div>
                <button onClick={() => removeJob(job)} className="text-gray-300 hover:text-rose-500">🗑️</button>
              </div>
              {job.desc && <p className="text-xs text-gray-400 mb-2">{job.desc}</p>}

              {holders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {holders.map((sid) => (
                    <span key={sid} className="bg-teal-50 text-teal-700 rounded-xl px-2.5 py-1 text-sm flex items-center gap-1">
                      {nameOf(sid)}
                      <button onClick={() => fire(job, sid)} className="text-teal-400 hover:text-rose-500">✕</button>
                    </span>
                  ))}
                </div>
              )}

              {applicants.length > 0 && (
                <div className="bg-amber-50 rounded-2xl p-2.5">
                  <div className="text-xs text-amber-700 mb-1">✋ 지원자 {applicants.length}명</div>
                  <div className="flex flex-wrap gap-1.5">
                    {applicants.map((sid) => (
                      <span key={sid} className="bg-white rounded-xl px-2 py-1 text-sm flex items-center gap-1.5">
                        {nameOf(sid)}
                        <button
                          onClick={() => hire(job, sid)}
                          disabled={full}
                          className="text-emerald-600 disabled:text-gray-300"
                          title={full ? '정원이 찼어요' : '채용'}
                        >
                          ✅
                        </button>
                        <button onClick={() => reject(job, sid)} className="text-gray-300 hover:text-rose-500">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!holders.length && !applicants.length && (
                <p className="text-xs text-gray-300">아직 지원자가 없어요. 학생 화면 🏛️학급 탭에서 지원할 수 있어요.</p>
              )}
            </div>
          );
        })}
        {!jobs.length && (
          <div className="col-span-full bg-white rounded-3xl shadow p-8 text-center text-gray-400">
            아직 직업이 없어요. 위에서 만들거나 '직업 예시 담기'를 눌러 보세요!
          </div>
        )}
      </div>

      {jobless.length > 0 && jobs.length > 0 && (
        <div className={card}>
          <h4 className="text-gray-500 mb-2">아직 직업이 없는 학생 {jobless.length}명</h4>
          <div className="flex flex-wrap gap-1.5">
            {jobless.map((s) => (
              <span key={s.id} className="bg-gray-100 rounded-xl px-2.5 py-1 text-sm">{s.avatar?.base || '🙂'} {s.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* 프리셋 모달 */}
      {presetOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setPresetOpen(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl mb-3">📋 직업 예시 고르기 <span className="text-sm text-gray-400">{picked.size}개 선택</span></h3>
            <div className="space-y-1.5 mb-4">
              {JOB_PRESETS.map((p, i) => (
                <label key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer border-2 ${picked.has(i) ? 'border-teal-300 bg-teal-50' : 'border-gray-100'}`}>
                  <input
                    type="checkbox" checked={picked.has(i)}
                    onChange={() => setPicked((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                    className="w-4 h-4"
                  />
                  <span className="text-xl">{p.emoji}</span>
                  <span className="flex-1 text-sm">{p.name} <span className="text-gray-400">— {p.desc}</span></span>
                  <span className="text-xs text-gray-400">{fmt(p.salary)} · {p.slots}명</span>
                </label>
              ))}
            </div>
            <button onClick={addPresets} disabled={!picked.size} className={btn + ' bg-teal-500 hover:bg-teal-600 w-full text-lg'}>
              선택한 {picked.size}개 직업 만들기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
