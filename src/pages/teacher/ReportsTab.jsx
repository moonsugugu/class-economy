import { useEffect, useState } from 'react';
import {
  collection, doc, query, orderBy, limit as qlimit,
  onSnapshot, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';

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

export default function ReportsTab({ klass }) {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'reports'), orderBy('at', 'desc'), qlimit(100));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  const ref = (id) => doc(db, 'classes', klass.id, 'reports', id);
  const cycle = (r) => updateDoc(ref(r.id), { status: NEXT[r.status] || 'doing' });
  const remove = (r) => confirm('이 글을 삭제할까요?') && deleteDoc(ref(r.id));
  const saveReply = async () => {
    await updateDoc(ref(replyTo.id), { reply: replyText.trim().slice(0, 300) });
    setReplyTo(null); setReplyText('');
  };

  if (!rows) return <div className="bg-white rounded-3xl shadow p-6">불러오는 중...</div>;

  const list = rows.filter((r) => filter === 'ALL' || r.kind === filter);
  const openCount = rows.filter((r) => r.status === 'open').length;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-3xl shadow p-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xl">🐞 버그 신고 · 건의함</h3>
          {openCount > 0 && (
            <span className="bg-rose-100 text-rose-600 rounded-xl px-3 py-1 text-sm">새 글 {openCount}개</span>
          )}
          <div className="ml-auto flex gap-2">
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
        </p>
      </div>

      {!list.length ? (
        <div className="bg-white rounded-3xl shadow p-8 text-center text-gray-400">아직 올라온 글이 없어요.</div>
      ) : (
        list.map((r) => {
          const [kLabel, kCls] = KIND[r.kind] || KIND.bug;
          const [sLabel, sCls] = STATUS[r.status] || STATUS.open;
          return (
            <div key={r.id} className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xl">{r.avatar}</span>
                <b className="text-gray-600">{r.studentName}</b>
                <span className={`text-[11px] px-2 py-0.5 rounded-lg ${kCls}`}>{kLabel}</span>
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
