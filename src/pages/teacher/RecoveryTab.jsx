import { useEffect, useMemo, useState } from 'react';
import {
  collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { BANKRUPTCY_GRANT } from '../../lib/loans.js';
import { isActiveStudent } from '../../lib/studentState';

const statusLabel = {
  requested: ['신청 접수', 'bg-amber-100 text-amber-700'],
  mission: ['봉사 미션 진행 중', 'bg-indigo-100 text-indigo-700'],
  submitted: ['완료 확인 대기', 'bg-fuchsia-100 text-fuchsia-700'],
  rehabilitated: ['회생 완료', 'bg-emerald-100 text-emerald-700'],
  rejected: ['신청 반려', 'bg-gray-100 text-gray-500'],
};

export default function RecoveryTab({ klass }) {
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'students'), orderBy('name'));
    return onSnapshot(q, (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isActiveStudent)));
  }, [klass.id]);

  const cases = useMemo(() => students.filter((student) => student.bankruptcy?.status), [students]);
  const pending = cases.filter((student) => ['requested', 'submitted'].includes(student.bankruptcy?.status));
  const flash = (text) => {
    setMsg(text);
    window.setTimeout(() => setMsg(''), 3500);
  };

  const approveMission = async (student) => {
    setBusyId(student.id);
    try {
      await updateDoc(doc(db, 'classes', klass.id, 'students', student.id), {
        bankruptcy: {
          ...student.bankruptcy,
          status: 'mission',
          mission: {
            title: '교실 정리와 교구 정돈',
            description: '교실 정리와 교구 정돈을 마친 뒤 선생님께 확인받으세요.',
            reward: BANKRUPTCY_GRANT,
          },
          missionStartedAt: Date.now(),
        },
      });
      flash(`${student.name} 학생에게 봉사 미션을 승인했어요.`);
    } catch (error) {
      flash(`승인 실패: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (student) => {
    if (!window.confirm(`${student.name} 학생의 파산 신청을 반려할까요?`)) return;
    setBusyId(student.id);
    try {
      await updateDoc(doc(db, 'classes', klass.id, 'students', student.id), {
        bankruptcy: { ...student.bankruptcy, status: 'rejected', rejectedAt: Date.now() },
      });
      flash(`${student.name} 학생의 신청을 반려했어요.`);
    } catch (error) {
      flash(`반려 실패: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const rehabilitate = async (student) => {
    if (!window.confirm(`${student.name} 학생의 회생을 승인하고 기본금 ${BANKRUPTCY_GRANT}을 지급할까요?`)) return;
    setBusyId(student.id);
    try {
      const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
      const latest = await getDoc(studentRef);
      const current = latest.exists() ? latest.data() : student;
      const loanSnap = await getDocs(query(
        collection(db, 'classes', klass.id, 'loans'),
        where('studentId', '==', student.id)
      ));
      const batch = writeBatch(db);
      loanSnap.docs.forEach((loanSnapDoc) => {
        const loan = loanSnapDoc.data();
        if (['active', 'overdue'].includes(loan.status)) {
          batch.update(doc(db, 'classes', klass.id, 'loans', loanSnapDoc.id), { status: 'settled-bankruptcy', settledAt: Date.now() });
        }
      });
      batch.update(studentRef, {
        cash: (Number(current.cash) || 0) + BANKRUPTCY_GRANT,
        bankruptcy: {
          ...(current.bankruptcy || student.bankruptcy),
          status: 'rehabilitated',
          reward: BANKRUPTCY_GRANT,
          rehabilitatedAt: Date.now(),
        },
      });
      await batch.commit();
      flash(`${student.name} 학생의 회생을 승인하고 기본금 ${BANKRUPTCY_GRANT}을 지급했어요.`);
    } catch (error) {
      flash(`회생 처리 실패: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="bg-white rounded-3xl shadow p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1">
          <h3 className="text-xl text-rose-700">🧯 파산·회생 관리</h3>
          <p className="text-sm text-gray-500 mt-1">학생의 순자산이 마이너스일 때 신청을 확인하고 봉사 미션과 회생금을 관리합니다.</p>
        </div>
        <span className="rounded-full bg-rose-100 text-rose-700 px-3 py-1 text-sm">처리 대기 {pending.length}명</span>
      </div>
      {msg && <div className="rounded-xl bg-indigo-50 text-indigo-700 px-3 py-2 text-sm">{msg}</div>}
      {!cases.length ? (
        <p className="py-10 text-center text-gray-400">아직 파산 신청 학생이 없어요.</p>
      ) : (
        <div className="space-y-3">
          {cases.map((student) => {
            const status = student.bankruptcy.status;
            const [label, tone] = statusLabel[status] || [status, 'bg-gray-100 text-gray-500'];
            return (
              <div key={student.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl">{student.avatar?.base || '🙂'}</span>
                  <div className="flex-1 min-w-0"><b>{student.name}</b><div className="text-xs text-gray-400">신청 당시 순자산 {fmt(student.bankruptcy.assetAtRequest)} {klass.currency}</div></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>
                </div>
                {status === 'requested' && <div className="flex gap-2 mt-3"><button onClick={() => approveMission(student)} disabled={busyId === student.id} className="rounded-xl px-3 py-2 text-sm bg-indigo-500 text-white disabled:opacity-40">봉사 미션 승인</button><button onClick={() => reject(student)} disabled={busyId === student.id} className="rounded-xl px-3 py-2 text-sm border border-gray-200 text-gray-500 disabled:opacity-40">반려</button></div>}
                {status === 'submitted' && <button onClick={() => rehabilitate(student)} disabled={busyId === student.id} className="mt-3 rounded-xl px-3 py-2 text-sm bg-emerald-500 text-white disabled:opacity-40">회생 승인 · 기본금 {BANKRUPTCY_GRANT} 지급</button>}
                {status === 'mission' && <p className="text-sm text-indigo-700 mt-3">봉사활동 확인 후 학생이 완료 제출하면 회생 승인을 눌러 주세요.</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
