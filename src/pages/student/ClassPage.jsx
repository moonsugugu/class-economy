import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, query, orderBy, limit as qlimit, onSnapshot,
  updateDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';

export default function ClassPage() {
  const { klass, student } = useOutletContext();
  const [jobs, setJobs] = useState([]);
  const [polls, setPolls] = useState([]);
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState(null);

  const taxRate = klass.taxRate ?? 10;
  const fund = klass.fund || 0;

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'jobs'), orderBy('createdAt'));
    return onSnapshot(q, (s) => setJobs(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'polls'), orderBy('at', 'desc'), qlimit(5));
    return onSnapshot(q, (s) => setPolls(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'fundLog'), orderBy('at', 'desc'), qlimit(10));
    return onSnapshot(q, (s) => setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const apply = async (job) => {
    if (student.jobId) return flash('err', '이미 직업이 있어요! 바꾸려면 선생님께 말씀드리세요.');
    await updateDoc(doc(db, 'classes', klass.id, 'jobs', job.id), { applicants: arrayUnion(student.id) });
    flash('ok', `✋ ${job.name}에 지원했어요! 선생님이 확인하면 채용돼요.`);
  };

  const cancelApply = async (job) => {
    await updateDoc(doc(db, 'classes', klass.id, 'jobs', job.id), { applicants: arrayRemove(student.id) });
  };

  const vote = async (poll, optId) => {
    if (poll.status !== 'open') return;
    await updateDoc(doc(db, 'classes', klass.id, 'polls', poll.id), { [`votes.${student.id}`]: optId });
    flash('ok', '🗳️ 투표했어요! 마음이 바뀌면 다시 눌러도 돼요.');
  };

  const myJob = jobs.find((j) => (j.holders || []).includes(student.id));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-emerald-600">🏛️ 우리 학급</h2>

      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {/* 공동기금 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg p-6">
        <span className="absolute -right-4 -top-5 text-8xl opacity-20 select-none">🏛️</span>
        <div className="relative">
          <div className="text-white/80 text-sm">우리가 낸 세금으로 모은 공동기금</div>
          <div className="text-4xl tabular-nums">{fmt(fund)} <span className="text-lg">{klass.currency}</span></div>
          <div className="text-xs text-white/70 mt-1">
            💸 월급을 받을 때마다 <b>{taxRate}%</b>가 세금으로 모여요 — 우리 반 모두를 위해 쓰여요!
          </div>
        </div>
      </div>

      {/* 내 직업 */}
      <div className="bg-white rounded-3xl shadow p-5">
        <h3 className="text-xl mb-2">🧑‍🍳 내 직업</h3>
        {myJob ? (
          <div className="flex items-center gap-3 bg-teal-50 rounded-2xl p-4">
            <span className="text-4xl">{myJob.emoji}</span>
            <div className="flex-1">
              <div className="text-lg text-teal-800">{myJob.name}</div>
              <div className="text-sm text-teal-600">{myJob.desc}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">직업 수당</div>
              <div className="text-lg text-teal-700 tabular-nums">+{fmt(myJob.salary)}</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            아직 직업이 없어요. 아래에서 하고 싶은 일에 지원해 보세요! 직업이 있으면 월급을 더 받아요 💰
          </p>
        )}
      </div>

      {/* 직업 목록 */}
      {jobs.length > 0 && (
        <div className="bg-white rounded-3xl shadow p-5">
          <h3 className="text-xl mb-1">💼 우리 반 일자리</h3>
          <p className="text-xs text-gray-400 mb-3">지원하면 선생님이 확인하고 채용해 주세요.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {jobs.map((job) => {
              const holders = job.holders || [];
              const applied = (job.applicants || []).includes(student.id);
              const mine = holders.includes(student.id);
              const full = holders.length >= job.slots;
              return (
                <div key={job.id} className={`rounded-2xl border-2 p-4 ${mine ? 'border-teal-400 bg-teal-50' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl">{job.emoji}</span>
                    <div className="flex-1">
                      <div>{job.name}</div>
                      <div className="text-xs text-gray-400">
                        수당 +{fmt(job.salary)} {klass.currency} · {holders.length}/{job.slots}명
                      </div>
                    </div>
                  </div>
                  {job.desc && <p className="text-xs text-gray-400 mb-2">{job.desc}</p>}
                  {mine ? (
                    <div className="text-center text-teal-600 text-sm py-1.5">내 직업이에요 ✓</div>
                  ) : applied ? (
                    <button onClick={() => cancelApply(job)} className="w-full rounded-xl py-1.5 text-sm bg-amber-100 text-amber-700">
                      ✋ 지원 완료 (누르면 취소)
                    </button>
                  ) : (
                    <button
                      onClick={() => apply(job)}
                      disabled={full || !!student.jobId}
                      className={`w-full rounded-xl py-1.5 text-sm text-white ${
                        full || student.jobId ? 'bg-gray-300' : 'bg-teal-500 hover:bg-teal-600'
                      }`}
                    >
                      {full ? '정원 마감' : student.jobId ? '이미 직업이 있어요' : '지원하기'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 투표 */}
      {polls.map((p) => {
        const counts = {};
        Object.values(p.votes || {}).forEach((oid) => { counts[oid] = (counts[oid] || 0) + 1; });
        const total = Object.keys(p.votes || {}).length;
        const myVote = (p.votes || {})[student.id];
        const open = p.status === 'open';
        const max = Math.max(0, ...Object.values(counts));
        return (
          <div key={p.id} className="bg-white rounded-3xl shadow p-5">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <h3 className="text-lg">🗳️ {p.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-lg ${open ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                {open ? '투표 중' : '종료'}
              </span>
              <span className="text-sm text-gray-400 ml-auto">{total}명 참여</span>
            </div>
            <div className="space-y-2">
              {p.options.map((o) => {
                const n = counts[o.id] || 0;
                const pct = total ? (n / total) * 100 : 0;
                const picked = myVote === o.id;
                const win = !open && n > 0 && n === max;
                return (
                  <button
                    key={o.id}
                    onClick={() => vote(p, o.id)}
                    disabled={!open}
                    className={`w-full text-left rounded-2xl border-2 p-3 transition ${
                      picked ? 'border-indigo-500 bg-indigo-50' : win ? 'border-amber-300 bg-amber-50' : 'border-gray-100'
                    } ${open ? 'hover:border-indigo-300' : ''}`}
                  >
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span className="text-xl">{o.emoji}</span>
                      <span className={picked ? 'text-indigo-700' : ''}>{o.text}</span>
                      {picked && <span className="text-indigo-500 text-xs">내 선택 ✓</span>}
                      {win && <span className="text-amber-600 text-xs">👑 1등</span>}
                      <span className="ml-auto tabular-nums text-gray-500">{n}표</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${picked ? 'bg-indigo-500' : win ? 'bg-amber-400' : 'bg-gray-300'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 기금 사용 내역 */}
      <div className="bg-white rounded-3xl shadow p-5">
        <h3 className="text-xl mb-1">📜 공동기금은 이렇게 쓰였어요</h3>
        <p className="text-xs text-gray-400 mb-3">우리가 낸 세금이 어디에 쓰이는지 확인해 보세요.</p>
        {!logs.length ? (
          <p className="text-gray-400 text-center py-4">아직 내역이 없어요.</p>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="flex items-center gap-2 py-2 border-b border-gray-100 text-sm">
              <span className={`px-2 py-0.5 rounded-lg text-xs ${l.type === 'tax' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {l.type === 'tax' ? '세금' : '사용'}
              </span>
              <span className="flex-1">{l.memo}</span>
              <span className={`tabular-nums ${l.type === 'tax' ? 'text-emerald-600' : 'text-rose-500'}`}>
                {l.type === 'tax' ? '+' : '−'}{fmt(l.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
