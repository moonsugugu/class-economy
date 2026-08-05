import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  collection, doc, query, orderBy, onSnapshot,
  addDoc, runTransaction, increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { itemPrice, pricePolicyLabel } from '../../lib/pricing';
import { TAX_LEDGER_ID, taxForPart } from '../../lib/taxes';

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
    const shownPrice = itemPrice(p.price, klass);
    const previewTax = taxForPart(shownPrice, klass, 'shop').tax;
    const previewTotal = shownPrice + previewTax;
    if (!confirm(`'${p.name}'을(를) 살까요?\n상품가 ${fmt(shownPrice)} + 세금 ${fmt(previewTax)} = 총 ${fmt(previewTotal)}${klass.currency}`)) return;
    setBusy(true);
    try {
      const productRef = doc(db, 'classes', klass.id, 'products', p.id);
      const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
      const classRef = doc(db, 'classes', klass.id);
      const ledgerRef = doc(db, 'classes', klass.id, 'taxLedger', TAX_LEDGER_ID);
      let paidPrice = shownPrice;
      let subtotal = shownPrice;
      let taxAmount = 0;
      await runTransaction(db, async (tx) => {
        const [pSnap, sSnap, kSnap] = [await tx.get(productRef), await tx.get(studentRef), await tx.get(classRef)];
        const pd = pSnap.data(), sd = sSnap.data();
        if (!pd || pd.qty <= 0) throw new Error('앗, 품절이에요!');
        const settings = { ...klass, ...(kSnap.data() || {}) };
        subtotal = itemPrice(pd.price, settings);
        taxAmount = taxForPart(subtotal, settings, 'shop').tax;
        paidPrice = subtotal + taxAmount;
        if (sd.cash < paidPrice) throw new Error('현금이 부족해요. 예금을 찾거나 열심히 모아 보세요!');
        tx.update(productRef, { qty: pd.qty - 1 });
        tx.update(studentRef, { cash: sd.cash - paidPrice });
        if (taxAmount > 0) {
          tx.set(ledgerRef, {
            pending: increment(taxAmount),
            shop: increment(taxAmount),
            updatedAt: Date.now(),
          }, { merge: true });
        }
      });
      await addDoc(collection(db, 'classes', klass.id, 'purchases'), {
        studentId: student.id,
        studentName: student.name,
        productId: p.id,
        productName: p.name,
        emoji: p.emoji || '🎁',
        price: paidPrice,
        subtotal,
        tax: taxAmount,
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
      <p className="text-xs text-gray-400 -mt-2">현재 물가: {pricePolicyLabel(klass, klass.currency)} · 선생님 설정에 따라 가격이 달라질 수 있어요.</p>
      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {products.map((p) => {
          const soldOut = p.qty <= 0;
          const price = itemPrice(p.price, klass);
          const tax = taxForPart(price, klass, 'shop').tax;
          const total = price + tax;
          const canBuy = !soldOut && student.cash >= total;
          return (
            <div key={p.id} className={`bg-white rounded-3xl shadow p-4 text-center ${soldOut ? 'opacity-50' : ''}`}>
              {p.imageUrl
                ? <img src={p.imageUrl} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-2" />
                : <div className="text-5xl mb-2">{p.emoji}</div>}
              <div className="text-lg leading-tight">{p.name}</div>
              <div className="text-amber-600 my-1">{fmt(total)} {klass.currency}</div>
              {tax > 0 && <div className="text-[10px] text-gray-400">상품 {fmt(price)} + 세금 {fmt(tax)}</div>}
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
