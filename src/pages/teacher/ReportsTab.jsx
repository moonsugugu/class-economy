import { useEffect, useState } from 'react';
import {
  collection, doc, query, orderBy, limit as qlimit,
  onSnapshot, updateDoc, deleteDoc, getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase';

const DEVELOPER_EMAIL = 'xdaethx@naver.com';

const KIND = {
  bug: ['🐞 버그', 'bg-rose-100 text-rose-600'],
  idea: ['💡 건의', 'bg-amber-100 text-amber-700'],
  ask: ['❓ 질문', 'bg-sky-100 text-sky-600'],
};
const NEXT = { open: 'doing', doing: 'done', done: 'open' };
const STATUS = {
  open: ['접수됨', 'bg-gray-100 text-gray-500'],
  doing: ['확인 중 👀', 'bg-amber-100 text-amber-700'],
  done: ['해결 ✅', 'bg-emerald-100 text-emerald-700'],
};

export default function ReportsTab({ klass, teacherEmail }) {
  const [rows, setRows] = useState(null);
  const [developerRows, setDeveloperRows] = useState([]);
  const [developerLoading, setDeveloperLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [view, setView] = useState('class');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const developerMode = teacherEmail?.toLowerCase() === DEVELOPER_EMAIL;

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'reports'), orderBy('at', 'desc'), qlimit(100));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  useEffect(() => {
    if (!developerMode) {
      setDeveloperRows([]);
      setView('class');
      return undefined;
    }
    let disposed = false;
    const unsubscribers = [];
    setDeveloperLoading(true);

    (async () => {
      try {
        const classSnap = await getDocs(collection(db, 'classes'));
        if (disposed) return;
        for (const classDoc of classSnap.docs) {
          const classId = classDoc.id;
          const className = classDoc.data().name || classId;
          const q = query(collection(db, 'classes', classId, 'reports'), orderBy('at', 'desc'), qlimit(100));
          const unsubscribe = onSnapshot(q, (snap) => {
            if (disposed) return;
            const incoming = snap.docs.map((d) => ({
              id: d.id, classId, className, ...d.data(),
            }));
            setDeveloperRows((previous) => [
              ...previous.filter((row) => row.classId !== classId),
              ...incoming,
            ].sort((a, b) => (b.at || 0) - (a.at || 0)));
          });
          unsubscribers.push(unsubscribe);
        }
      } catch {
        if (!disposed) setDeveloperRows([]);
      } finally {
        if (!disposed) setDeveloperLoading(false);
      }
    })();

    return () => {
      disposed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [developerMode]);

  const ref = (row) => doc(db, 'classes', row.classId || klass.id, 'reports', row.id);
  const cycle = (r) => updateDoc(ref(r), { status: NEXT[r.status] || 'doing' });
  const remove = (r) => confirm('이 글을 삭제할까요?') && deleteDoc(ref(r));
  const saveReply = async () => {
    await updateDoc(ref(replyTo), { reply: replyText.trim().slice(0, 300) });
    setReplyTo(null); setReplyText('');
  };

  const sendToDeveloper = async (r) => {
    try {
      const className = r.className || klass.name;
      await updateDoc(ref(r), {
        developerEmail: DEVELOPER_EMAIL,
        developerSentAt: Date.now(),
      });
      const kindLabel = KIND[r.kind]?.[0] || '건의';
      const subject = `[우리 반 경제나라] ${kindLabel} · ${className} · ${r.studentName}`;
      const body = [
        `학급: ${className}`,
        `학생: ${r.studentName}`,
        `분류: ${kindLabel}`,
        `작성일: ${new Date(r.at || Date.now()).toLocaleString('ko-KR')}`,
        '',
        r.text,
        '',
        `건의 문서 ID: ${r.id}`,
      ].join('\n');
      window.location.href = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch (e) {
      alert(`개발자에게 보낼 준비를 하지 못했어요: ${e.message}`);
    }
  };

  if (!rows) return <div className="bg-white rounded-3xl shadow p-6">불러오는 중...</div>;

  const list = rows.filter((r) => filter === 'ALL' || r.kind === filter);
  const openCount = rows.filter((r) => r.status === 'open').length;
  const displayRows = view === 'developer'
    ? developerRows.filter((r) => filter === 'ALL' || r.kind === filter)
    : list;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-3xl shadow p-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xl">{view === 'developer' ? '🛠️ 개발자 수신함' : '🐞 버그 신고 · 건의함'}</h3>
          {openCount > 0 && (
            <span className="bg-rose-100 text-rose-600 rounded-xl px-3 py-1 text-sm">새 글 {openCount}개</span>
          )}
          <div className="ml-auto flex gap-2 flex-wrap">
            {developerMode && (
              <>
                <button
                  onClick={() => setView('class')}
                  className={`px-3 py-1 rounded-xl text-sm ${view === 'class' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  현재 학급
                </button>
                <button
                  onClick={() => setView('developer')}
                  className={`px-3 py-1 rounded-xl text-sm ${view === 'developer' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  전체 개발자 수신함
                </button>
              </>
            )}
            {[['ALL', '전체'], ['bug', '🐞 버그'], ['idea', '💡 건의'], ['ask', '❓ 질문']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`px-3 py-1 rounded-xl text-sm ${filter === id ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          상태 배지를 누르면 접수됨 → 확인 중 → 해결 순서로 바뀌어요. 답글을 달면 학생 화면에 표시됩니다.
          {view === 'developer' && ' 다른 학급에서 보낸 건의도 함께 표시됩니다.'}
        </p>
      </div>

      {view === 'developer' && developerLoading ? (
        <div className="bg-white rounded-3xl shadow p-8 text-center text-gray-400">전체 학급 건의함을 불러오는 중...</div>
      ) : !displayRows.length ? (
        <div className="bg-white rounded-3xl shadow p-8 text-center text-gray-400">아직 올라온 글이 없어요.</div>
      ) : (
        displayRows.map((r) => {
          const [kLabel, kCls] = KIND[r.kind] || KIND.bug;
          const [sLabel, sCls] = STATUS[r.status] || STATUS.open;
          return (
            <div key={`${r.classId || klass.id}-${r.id}`} className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xl">{r.avatar}</span>
                <b className="text-gray-600">{r.studentName}</b>
                <span className={`text-[11px] px-2 py-0.5 rounded-lg ${kCls}`}>{kLabel}</span>
                {view === 'developer' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600">🏫 {r.className}</span>
                )}
                <button onClick={() => cycle(r)} className={`text-[11px] px-2 py-0.5 rounded-lg ${sCls}`}>{sLabel}</button>
                {(r.likes || []).length > 0 && (
                  <span className="text-[11px] text-rose-400">❤️ {(r.likes || []).length}명도 겪음</span>
                )}
                <span className="ml-auto text-[11px] text-gray-300">
                  {new Date(r.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{r.text}</p>
              {r.reply && (
                <div className="mt-2 bg-indigo-50 rounded-xl px-3 py-2 text-sm text-indigo-700">👩‍🏫 {r.reply}</div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setReplyTo(r); setReplyText(r.reply || ''); }}
                  className="text-sm rounded-lg px-3 py-1 bg-indigo-100 text-indigo-600"
                >
                  ✍️ 답글
                </button>
                {view === 'class' && (
                  <button
                    onClick={() => sendToDeveloper(r)}
                    className="text-sm rounded-lg px-3 py-1 bg-sky-100 text-sky-700"
                  >
                    📧 개발자에게 보내기
                  </button>
                )}
                <button onClick={() => remove(r)} className="ml-auto text-xs text-gray-300 hover:text-rose-500">삭제</button>
              </div>
            </div>
          );
        })
      )}

      {replyTo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setReplyTo(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl">✍️ {replyTo.studentName} 학생에게 답글</h3>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">{replyTo.text}</p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="알려줘서 고마워요! 곧 고칠게요 😊"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-indigo-400 resize-none"
            />
            <button onClick={saveReply} className="w-full rounded-xl py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white">답글 남기기</button>
          </div>
        </div>
      )}
    </div>
  );
}
