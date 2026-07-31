import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, query, orderBy, limit as qlimit, onSnapshot,
  addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const KINDS = [
  ['bug', '🐞 버그(오류)', 'bg-rose-100 text-rose-600'],
  ['idea', '💡 이런 게 있으면 좋겠어요', 'bg-amber-100 text-amber-700'],
  ['ask', '❓ 궁금해요', 'bg-sky-100 text-sky-600'],
];
const STATUS = {
  open: ['접수됨', 'bg-gray-100 text-gray-500'],
  doing: ['확인 중 👀', 'bg-amber-100 text-amber-700'],
  done: ['해결됐어요 ✅', 'bg-emerald-100 text-emerald-700'],
};

export default function ReportPage() {
  const { klass, student } = useOutletContext();
  const [rows, setRows] = useState(null);
  const [kind, setKind] = useState('bug');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'reports'), orderBy('at', 'desc'), qlimit(50));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (t.length < 5) return setMsg('무슨 일이 있었는지 조금만 더 자세히 적어 주세요! (5글자 이상)');
    setBusy(true);
    try {
      await addDoc(collection(db, 'classes', klass.id, 'reports'), {
        kind,
        text: t.slice(0, 500),
        studentId: student.id,
        studentName: student.name,
        avatar: student.avatar?.base || '🙂',
        status: 'open',
        likes: [],
        reply: '',
        at: Date.now(),
        createdAt: serverTimestamp(),
      });
      setText('');
      setMsg('🙏 고마워요! 선생님께 전달됐어요.');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = (r) => {
    const liked = (r.likes || []).includes(student.id);
    updateDoc(doc(db, 'classes', klass.id, 'reports', r.id), {
      likes: liked ? arrayRemove(student.id) : arrayUnion(student.id),
    });
  };

  const remove = (r) => {
    if (r.studentId !== student.id) return;
    if (!confirm('내가 쓴 글을 지울까요?')) return;
    deleteDoc(doc(db, 'classes', klass.id, 'reports', r.id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl text-rose-500">🐞 버그 신고 · 건의함</h2>
        <p className="text-sm text-gray-400">앱을 쓰다가 이상한 점이나 좋은 생각이 떠오르면 알려 주세요!</p>
      </div>

      {/* 작성 폼 */}
      <form onSubmit={send} className="bg-white rounded-3xl shadow p-5 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {KINDS.map(([id, label, cls]) => (
            <button
              key={id} type="button"
              onClick={() => setKind(id)}
              className={`px-3 py-1.5 rounded-xl text-sm transition ${kind === id ? cls + ' ring-2 ring-offset-1 ring-rose-300' : 'bg-gray-100 text-gray-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={kind === 'bug'
            ? '어떤 화면에서, 무엇을 눌렀을 때, 어떻게 이상했는지 적어 주세요!'
            : '어떤 기능이 있으면 더 재미있을까요?'}
          className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-rose-400 outline-none resize-none"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-300">{text.length}/500</span>
          <button disabled={busy} className="ml-auto rounded-xl px-5 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white shadow">
            {busy ? '보내는 중...' : '📮 보내기'}
          </button>
        </div>
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      </form>

      {/* 목록 */}
      <div className="space-y-2">
        {!rows ? (
          <div className="text-center text-gray-400 py-8">불러오는 중...</div>
        ) : !rows.length ? (
          <div className="bg-white rounded-3xl shadow p-8 text-center text-gray-400">
            아직 올라온 글이 없어요. 첫 번째로 알려 주세요! 🐞
          </div>
        ) : (
          rows.map((r) => {
            const [, kLabel, kCls] = KINDS.find(([k]) => k === r.kind) || KINDS[0];
            const [sLabel, sCls] = STATUS[r.status] || STATUS.open;
            const liked = (r.likes || []).includes(student.id);
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xl">{r.avatar}</span>
                  <span className="text-sm text-gray-600">{r.studentName}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-lg ${kCls}`}>{kLabel}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-lg ${sCls}`}>{sLabel}</span>
                  <span className="ml-auto text-[11px] text-gray-300">
                    {new Date(r.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{r.text}</p>
                {r.reply && (
                  <div className="mt-2 bg-indigo-50 rounded-xl px-3 py-2 text-sm text-indigo-700">
                    👩‍🏫 선생님: {r.reply}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => toggleLike(r)}
                    className={`text-sm rounded-lg px-3 py-1 transition ${liked ? 'bg-rose-100 text-rose-500' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {liked ? '❤️' : '🤍'} {(r.likes || []).length}
                  </button>
                  <span className="text-xs text-gray-300">나도 겪었어요!</span>
                  {r.studentId === student.id && (
                    <button onClick={() => remove(r)} className="ml-auto text-xs text-gray-300 hover:text-rose-400">삭제</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
