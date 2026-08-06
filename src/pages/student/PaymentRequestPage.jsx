import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  addDoc, collection, onSnapshot, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';

const STATUS_LABEL = {
  pending: ['대기 중', 'bg-amber-100 text-amber-700'],
  approved: ['지급 완료', 'bg-emerald-100 text-emerald-700'],
  rejected: ['반려됨', 'bg-rose-100 text-rose-600'],
};

export default function PaymentRequestPage() {
  const { klass, student } = useOutletContext();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'classes', klass.id, 'paymentRequests'),
      where('studentId', '==', student.id),
    );
    return onSnapshot(q, (snap) => {
      setRequests(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)),
      );
    });
  }, [klass.id, student.id]);

  const pending = useMemo(() => requests.filter((item) => item.status === 'pending'), [requests]);

  const flash = (type, text) => {
    setMsg({ type, text });
    window.setTimeout(() => setMsg(null), 3500);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const value = Math.floor(Number(amount));
    const text = reason.trim();
    if (!value || value < 1) return flash('err', '지급받을 금액을 입력해 주세요.');
    if (!text) return flash('err', '지급 이유를 적어 주세요.');
    setBusy(true);
    try {
      await addDoc(collection(db, 'classes', klass.id, 'paymentRequests'), {
        studentId: student.id,
        studentName: student.name,
        amount: value,
        reason: text.slice(0, 200),
        status: 'pending',
        createdAtMs: Date.now(),
        createdAt: serverTimestamp(),
      });
      setAmount('');
      setReason('');
      flash('ok', '지급요청서를 보냈어요. 선생님 확인 후 바로 지급됩니다.');
    } catch (error) {
      flash('err', `지급요청을 보내지 못했어요: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-500 p-6 text-white shadow-lg">
        <div className="text-4xl">🧾</div>
        <h2 className="mt-2 text-2xl">지급요청서 쓰기</h2>
        <p className="mt-1 text-sm text-white/80">필요한 금액과 이유를 적어 선생님께 보내 보세요.</p>
        {pending.length > 0 && <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-sm">현재 확인을 기다리는 요청 {pending.length}건</p>}
      </div>

      {msg && <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</div>}

      <form onSubmit={submit} className="rounded-3xl bg-white p-5 shadow space-y-4">
        <div>
          <label className="mb-1 block text-sm text-gray-500">지급받을 금액</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="예: 100"
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-3 outline-none focus:border-indigo-400"
            />
            <span className="shrink-0 text-gray-500">{klass.currency}</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-500">지급 이유</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="예: 학급 행사 준비물을 샀어요."
            maxLength={200}
            rows={3}
            className="w-full resize-none rounded-xl border-2 border-gray-200 px-3 py-3 outline-none focus:border-indigo-400"
          />
        </div>
        <button disabled={busy} className="w-full rounded-2xl bg-indigo-500 py-3 text-lg font-bold text-white shadow hover:bg-indigo-600 disabled:opacity-40">
          {busy ? '보내는 중...' : '선생님께 지급요청하기'}
        </button>
      </form>

      <div className="rounded-3xl bg-white p-5 shadow">
        <h3 className="mb-3 text-lg text-gray-700">내 지급요청 내역</h3>
        <div className="space-y-2">
          {requests.map((item) => {
            const [label, style] = STATUS_LABEL[item.status] || STATUS_LABEL.pending;
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-gray-700">{item.reason}</div>
                  <div className="text-xs text-gray-400">{fmt(item.amount)} {klass.currency}</div>
                </div>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-xs ${style}`}>{label}</span>
              </div>
            );
          })}
          {!requests.length && <p className="py-5 text-center text-sm text-gray-400">아직 보낸 지급요청이 없어요.</p>}
        </div>
      </div>
    </div>
  );
}
