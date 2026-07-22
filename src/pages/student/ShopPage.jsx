import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, query, orderBy, onSnapshot,
  addDoc, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';

export default function ShopPage() {
  const { klass, student } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [msg, setMsg] = useState(null); // {type, text}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'classes', klass.id, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [klass.id]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const buy = async (p) => {
    if (busy) return;
    if (!confirm(`'${p.name}'을(를) ${fmt(p.price)}${klass.currency}에 살까요?`)) return;
    setBusy(true);
    try {
      const productRef = doc(db, 'classes', klass.id, 'products', p.id);
      const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
      await runTransaction(db, async (tx) => {
        const [pSnap, sSnap] = [await tx.get(productRef), await tx.get(studentRef)];
        const pd = pSnap.data(), sd = sSnap.data();
        if (!pd || pd.qty <= 0) throw new Error('앗, 품절이에요!');
        if (sd.cash < pd.price) throw new Error('현금이 부족해요. 예금을 찾거나 열심히 모아 보세요!');
        tx.update(productRef, { qty: pd.qty - 1 });
        tx.update(studentRef, { cash: sd.cash - pd.price });
      });
      await addDoc(collection(db, 'classes', klass.id, 'purchases'), {
        studentId: student.id,
        studentName: student.name,
        productId: p.id,
        productName: p.name,
        emoji: p.emoji || '🎁',
        price: p.price,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      flash('ok', `🎉 '${p.name}' 구매 완료! 선생님께 알림이 갔어요.`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-amber-600">🏪 학급 상점</h2>
      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {products.map((p) => {
          const soldOut = p.qty <= 0;
          const canBuy = !soldOut && student.cash >= p.price;
          return (
            <div key={p.id} className={`bg-white rounded-3xl shadow p-4 text-center ${soldOut ? 'opacity-50' : ''}`}>
              {p.imageUrl
                ? <img src={p.imageUrl} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-2" />
                : <div className="text-5xl mb-2">{p.emoji}</div>}
              <div className="text-lg leading-tight">{p.name}</div>
              <div className="text-amber-600 my-1">{fmt(p.price)} {klass.currency}</div>
              <div className="text-xs text-gray-400 mb-2">{soldOut ? '품절' : `남은 수량 ${p.qty}개`}</div>
              <button
                disabled={soldOut || busy}
                onClick={() => buy(p)}
                className={`w-full rounded-xl py-2 text-white transition ${
                  canBuy ? 'bg-amber-400 hover:bg-amber-500' : 'bg-gray-300'
                }`}
              >
                {soldOut ? '품절' : '구매하기'}
              </button>
            </div>
          );
        })}
        {!products.length && (
          <div className="col-span-full text-center text-gray-400 py-10">아직 상품이 없어요. 선생님을 기다려 주세요!</div>
        )}
      </div>
    </div>
  );
}
