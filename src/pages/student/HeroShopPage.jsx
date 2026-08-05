import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { HERO_ITEMS, HERO_SLOTS, normalizeHero } from '../../lib/hero';

export default function HeroShopPage() {
  const { klass, student } = useOutletContext();
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);
  const hero = normalizeHero(student.rpg);
  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const characters = HERO_ITEMS.filter((item) => item.slot === 'character');

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const buy = async (item) => {
    if (hero.owned.includes(item.id)) return;
    if (item.slot !== 'character' && !hero.character) {
      flash('err', '먼저 남자 또는 여자 용사를 구매해 주세요.');
      return;
    }
    if (!confirm(`'${item.name}'을(를) ${fmt(item.price)}${klass.currency}에 구매할까요?`)) return;
    setBusyId(item.id);
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const current = normalizeHero(s.rpg);
        if (current.owned.includes(item.id)) throw new Error('이미 가지고 있는 아이템이에요.');
        if (item.slot !== 'character' && !current.character) throw new Error('먼저 캐릭터를 구매해 주세요.');
        if ((s.cash || 0) < item.price) throw new Error('현금이 부족해요.');
        const next = {
          ...current,
          owned: [...current.owned, item.id],
          character: item.slot === 'character' && !current.character ? item.id : current.character,
          equipment: { ...current.equipment },
        };
        if (item.slot !== 'character' && !next.equipment[item.slot]) next.equipment[item.slot] = item.id;
        tx.update(studentRef, { cash: (s.cash || 0) - item.price, rpg: next });
      });
      flash('ok', `🛒 '${item.name}' 구매 완료!`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const equip = async (item) => {
    setBusyId(item.id);
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const current = normalizeHero(s.rpg);
        if (!current.owned.includes(item.id)) throw new Error('먼저 구매해 주세요.');
        const next = { ...current, equipment: { ...current.equipment } };
        if (item.slot === 'character') next.character = item.id;
        else next.equipment[item.slot] = item.id;
        tx.update(studentRef, { rpg: next });
      });
      flash('ok', `✨ ${item.name} 장착 완료!`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const refund = async (item) => {
    const refundPrice = Math.floor(item.price * 0.5);
    if (!confirm(`'${item.name}'을(를) ${refundPrice}${klass.currency}에 환불할까요?`)) return;
    setBusyId(item.id);
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const current = normalizeHero(s.rpg);
        if (!current.owned.includes(item.id)) throw new Error('환불할 아이템을 찾지 못했어요.');
        const next = {
          ...current,
          owned: current.owned.filter((id) => id !== item.id),
          character: current.character === item.id ? null : current.character,
          equipment: { ...current.equipment },
        };
        if (next.equipment[item.slot] === item.id) delete next.equipment[item.slot];
        tx.update(studentRef, { cash: (s.cash || 0) + refundPrice, rpg: next });
      });
      flash('ok', `♻️ ${item.name} 환불 완료! 50%를 돌려받았어요.`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const card = (item) => {
    const owned = hero.owned.includes(item.id);
    const equipped = item.slot === 'character'
      ? hero.character === item.id
      : hero.equipment[item.slot] === item.id;
    const locked = item.slot !== 'character' && !hero.character && !owned;
    return (
      <div key={item.id} className={`bg-white rounded-3xl shadow p-4 text-center ${owned ? 'ring-2 ring-emerald-100' : ''}`}>
        <div className="text-5xl mb-2">{item.emoji}</div>
        <div className="text-sm text-gray-700">{item.name}</div>
        <div className="text-xs text-indigo-500 my-1">전투력 +{item.power}</div>
        <div className="text-xs text-amber-600 mb-2">{fmt(item.price)} {klass.currency}</div>
        {owned ? (
          <div className="space-y-1">
            <button
              onClick={() => equip(item)}
              disabled={busyId === item.id}
              className={`w-full rounded-xl py-1.5 text-sm ${equipped ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}
            >
              {equipped ? '장착 중 ✓' : '장착하기'}
            </button>
            <button onClick={() => refund(item)} disabled={busyId === item.id} className="text-xs text-rose-500 underline">
              50% 환불 ({fmt(Math.floor(item.price * 0.5))})
            </button>
          </div>
        ) : (
          <button
            onClick={() => buy(item)}
            disabled={busyId === item.id || locked || student.cash < item.price}
            className="w-full rounded-xl py-1.5 text-sm text-white bg-amber-400 hover:bg-amber-500 disabled:bg-gray-300"
          >
            {locked ? '캐릭터 먼저 구매' : '구매하기'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-2xl text-amber-600">🛒 용사키우기 상점</h2>
          <p className="text-sm text-gray-400">모든 캐릭터와 장비는 현금으로 구매하고, 언제든 50% 환불할 수 있어요.</p>
        </div>
        <Link to="/student/hero" className="ml-auto text-sm text-indigo-500 underline">← 용사 화면</Link>
      </div>
      <div className="rounded-2xl bg-amber-50 text-amber-700 px-4 py-3 text-sm">내 현금: <b>{fmt(student.cash)} {klass.currency}</b> · 아이템마다 전투력이 올라가요.</div>
      {msg && <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</div>}

      <section>
        <h3 className="text-lg text-gray-600 mb-2">🧙 캐릭터 선택</h3>
        <div className="grid grid-cols-2 gap-3">{characters.map(card)}</div>
      </section>

      {HERO_SLOTS.map(([slot, label]) => (
        <section key={slot}>
          <h3 className="text-lg text-gray-600 mb-2">{label}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {HERO_ITEMS.filter((item) => item.slot === slot).map(card)}
          </div>
        </section>
      ))}
    </div>
  );
}
