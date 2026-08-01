import { useEffect, useState } from 'react';
import {
  collection, doc, query, orderBy, limit as qlimit, onSnapshot,
  addDoc, updateDoc, deleteDoc, increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { POLL_PRESETS } from '../../lib/jobs';

const card = 'bg-white rounded-3xl shadow p-6';
const input = 'rounded-xl border-2 border-gray-200 px-3 py-2 focus:border-indigo-400 outline-none';
const btn = 'rounded-xl px-4 py-2 text-white shadow transition disabled:opacity-40';

export default function FundTab({ klass }) {
  const [logs, setLogs] = useState([]);
  const [polls, setPolls] = useState([]);
  const [spend, setSpend] = useState({ amount: '', memo: '' });
  const [poll, setPoll] = useState({ title: '', options: ['', '', ''] });
  const [msg, setMsg] = useState('');

  const classRef = doc(db, 'classes', klass.id);
  const fund = klass.fund || 0;
  const taxRate = klass.taxRate ?? 10;

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'fundLog'), orderBy('at', 'desc'), qlimit(30));
    return onSnapshot(q, (s) => setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'polls'), orderBy('at', 'desc'), qlimit(10));
    return onSnapshot(q, (s) => setPolls(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const useFund = async () => {
    const amt = Math.floor(Number(spend.amount));
    if (!amt || amt < 1) return flash('사용할 금액을 입력해 주세요.');
    if (amt > fund) return flash('공동기금이 부족해요!');
    await updateDoc(classRef, { fund: increment(-amt) });
    await addDoc(collection(db, 'classes', klass.id, 'fundLog'), {
      type: 'spend', amount: amt, memo: spend.memo.trim() || '학급 공동 물품', at: Date.now(), createdAt: serverTimestamp(),
    });
    setSpend({ amount: '', memo: '' });
    flash(`💸 공동기금에서 ${fmt(amt)}${klass.currency}를 사용했어요.`);
  };

  const createPoll = async (preset) => {
    const title = preset ? preset.title : poll.title.trim();
    const opts = preset
      ? preset.options.map((o, i) => ({ id: String(i), emoji: o.emoji, text: o.text }))
      : poll.options.filter((t) => t.trim()).map((t, i) => ({ id: String(i), emoji: '🗳️', text: t.trim() }));
    if (!title || opts.length < 2) return flash('제목과 선택지를 2개 이상 적어 주세요.');
    await addDoc(collection(db, 'classes', klass.id, 'polls'), {
      title, options: opts, votes: {}, status: 'open', at: Date.now(), createdAt: serverTimestamp(),
    });
    setPoll({ title: '', options: ['', '', ''] });
    flash('🗳️ 투표를 시작했어요! 학생 화면 🏛️학급 탭에서 참여할 수 있어요.');
  };

  const closePoll = (p) => updateDoc(doc(db, 'classes', klass.id, 'polls', p.id), { status: 'closed' });
  const reopenPoll = (p) => updateDoc(doc(db, 'classes', klass.id, 'polls', p.id), { status: 'open' });
  const removePoll = (p) => confirm('이 투표를 삭제할까요?') && deleteDoc(doc(db, 'classes', klass.id, 'polls', p.id));

  const tally = (p) => {
    const counts = {};
    Object.values(p.votes || {}).forEach((oid) => { counts[oid] = (counts[oid] || 0) + 1; });
    return counts;
  };

  return (
    <div className="space-y-4">
      {/* 기금 현황 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg p-6">
        <span className="absolute -right-4 -top-4 text-8xl opacity-20 select-none">🏛️</span>
        <div className="relative">
          <div className="text-white/80">우리 학급 공동기금</div>
          <div className="text-4xl tabular-nums">{fmt(fund)} <span className="text-lg">{klass.currency}</span></div>
          <div className="text-sm text-white/70 mt-1">
            💸 월급을 줄 때마다 세금 <b>{taxRate}%</b>가 자동으로 여기 모여요
            {taxRate === 0 && ' (지금은 0% — ⚙️설정에서 바꿀 수 있어요)'}
          </div>
        </div>
      </div>

      {msg && <div className="bg-indigo-50 text-indigo-700 rounded-2xl px-4 py-3">{msg}</div>}

      {/* 기금 사용 */}
      <div className={card}>
        <h3 className="text-xl mb-3">💸 공동기금 사용하기</h3>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-xs text-gray-400 block">금액</label>
            <input type="number" value={spend.amount} onChange={(e) => setSpend({ ...spend, amount: e.target.value })} className={input + ' w-28'} />
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-xs text-gray-400 block">어디에 썼나요?</label>
            <input value={spend.memo} onChange={(e) => setSpend({ ...spend, memo: e.target.value })} placeholder="예: 학급 보드게임 구입" className={input + ' w-full'} />
          </div>
          <button onClick={useFund} className={btn + ' bg-emerald-500 hover:bg-emerald-600'}>사용 기록하기</button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          실제 물건을 사고 여기에 기록하면, 학생들이 "우리가 낸 세금이 이렇게 쓰였구나"를 볼 수 있어요.
        </p>
      </div>

      {/* 투표 만들기 */}
      <div className={card}>
        <h3 className="text-xl mb-1">🗳️ 학급 투표</h3>
        <p className="text-xs text-gray-400 mb-3">공동기금 사용처나 학급 규칙을 학생들이 직접 정하게 해보세요.</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {POLL_PRESETS.map((p, i) => (
            <button key={i} onClick={() => createPoll(p)} className="rounded-xl px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm hover:bg-indigo-100">
              + {p.title}
            </button>
          ))}
        </div>
        <input
          value={poll.title}
          onChange={(e) => setPoll({ ...poll, title: e.target.value })}
          placeholder="직접 만들기 — 투표 제목"
          className={input + ' w-full mb-2'}
        />
        <div className="grid sm:grid-cols-3 gap-2 mb-2">
          {poll.options.map((t, i) => (
            <input
              key={i}
              value={t}
              onChange={(e) => setPoll({ ...poll, options: poll.options.map((o, j) => (j === i ? e.target.value : o)) })}
              placeholder={`선택지 ${i + 1}`}
              className={input}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPoll({ ...poll, options: [...poll.options, ''] })} className="text-sm text-indigo-500 underline">+ 선택지 추가</button>
          <button onClick={() => createPoll(null)} className={btn + ' bg-indigo-500 hover:bg-indigo-600 ml-auto'}>🗳️ 투표 시작</button>
        </div>
      </div>

      {/* 진행 중/지난 투표 */}
      {polls.map((p) => {
        const counts = tally(p);
        const total = Object.keys(p.votes || {}).length;
        const max = Math.max(0, ...Object.values(counts));
        return (
          <div key={p.id} className={card}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <h4 className="text-lg">{p.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-lg ${p.status === 'open' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                {p.status === 'open' ? '진행 중' : '종료'}
              </span>
              <span className="text-sm text-gray-400">{total}명 참여</span>
              <div className="ml-auto flex gap-2">
                {p.status === 'open'
                  ? <button onClick={() => closePoll(p)} className={btn + ' bg-rose-400 hover:bg-rose-500 text-sm'}>투표 종료</button>
                  : <button onClick={() => reopenPoll(p)} className={btn + ' bg-indigo-400 hover:bg-indigo-500 text-sm'}>다시 열기</button>}
                <button onClick={() => removePoll(p)} className="text-gray-300 hover:text-rose-500">🗑️</button>
              </div>
            </div>
            <div className="space-y-2">
              {p.options.map((o) => {
                const n = counts[o.id] || 0;
                const pct = total ? (n / total) * 100 : 0;
                const win = n > 0 && n === max;
                return (
                  <div key={o.id}>
                    <div className="flex items-center gap-2 text-sm mb-0.5">
                      <span className="text-lg">{o.emoji}</span>
                      <span className={win ? 'text-indigo-700 font-bold' : ''}>{o.text}{win && ' 👑'}</span>
                      <span className="ml-auto tabular-nums text-gray-500">{n}표 ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${win ? 'bg-indigo-500' : 'bg-indigo-300'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 기금 내역 */}
      <div className={card}>
        <h3 className="text-xl mb-3">📜 공동기금 내역</h3>
        {!logs.length ? (
          <p className="text-gray-400 text-center py-6">아직 내역이 없어요. 월급을 지급하면 세금이 모이기 시작해요!</p>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="flex items-center gap-2 py-2 border-b border-gray-100 text-sm">
              <span className={`px-2 py-0.5 rounded-lg text-xs ${l.type === 'tax' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {l.type === 'tax' ? '세금 적립' : '사용'}
              </span>
              <span className="flex-1">{l.memo}</span>
              <span className={`tabular-nums ${l.type === 'tax' ? 'text-emerald-600' : 'text-rose-500'}`}>
                {l.type === 'tax' ? '+' : '−'}{fmt(l.amount)}
              </span>
              <span className="text-[11px] text-gray-300 w-16 text-right hidden sm:block">
                {new Date(l.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
