import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { doc, runTransaction, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import {
  HERO_ITEMS, HERO_SLOTS, HERO_PETS, HERO_PET_SLOT, HERO_RARITIES, HERO_SHOP_REFRESH_LIMIT,
  normalizeHero, formatHeroSpecialStats, heroDateKey, heroShopFor,
} from '../../lib/hero';
import HeroPreview from '../../three/Hero3D.jsx';
import { HeroItemVisual, HeroRarityBadge } from '../../components/HeroItemVisual.jsx';
import { itemPrice, pricePolicyLabel } from '../../lib/pricing';
import { TAX_LEDGER_ID, taxForPart } from '../../lib/taxes';

export default function HeroShopPage() {
  const { klass, student } = useOutletContext();
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [view, setView] = useState('shop');
  const hero = normalizeHero(student.rpg);
  const today = heroDateKey();
  const refreshes = hero.shop.date === today ? hero.shop.refreshes : 0;
  const shopIds = Object.values(heroShopFor(klass.id, today, refreshes)).flat();
  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const characters = HERO_ITEMS.filter((item) => item.slot === 'character');
  const costOf = (item) => itemPrice(item.price, klass);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const buy = async (item) => {
    if (hero.owned.includes(item.id)) return;
    if (item.slot !== 'character' && !shopIds.includes(item.id)) {
      flash('err', '오늘 상점에 나온 아이템만 구매할 수 있어요. 새로고침으로 상품을 바꿔 보세요.');
      return;
    }
    if (item.slot !== 'character' && !hero.character) {
      flash('err', '먼저 남자 또는 여자 용사를 구매해 주세요.');
      return;
    }
    const price = costOf(item);
    const previewTax = taxForPart(price, klass, 'item').tax;
    const previewTotal = price + previewTax;
    if (!confirm(`'${item.name}'을(를) 구매할까요?\n상품가 ${fmt(price)} + 세금 ${fmt(previewTax)} = 총 ${fmt(previewTotal)}${klass.currency}`)) return;
    setBusyId(item.id);
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const settings = { ...klass, ...((await tx.get(doc(db, 'classes', klass.id))).data() || {}) };
        const currentPrice = itemPrice(item.price, settings);
        const tax = taxForPart(currentPrice, settings, 'item').tax;
        const total = currentPrice + tax;
        const current = normalizeHero(s.rpg);
        if (current.owned.includes(item.id)) throw new Error('이미 가지고 있는 아이템이에요.');
        if (item.slot !== 'character' && !current.character) throw new Error('먼저 캐릭터를 구매해 주세요.');
        if ((s.cash || 0) < total) throw new Error('현금이 부족해요.');
        const next = {
          ...current,
          owned: [...current.owned, item.id],
          character: item.slot === 'character' && !current.character ? item.id : current.character,
          equipment: { ...current.equipment },
        };
        if (item.slot === 'pet') next.pet = item.id;
        else if (item.slot !== 'character' && !next.equipment[item.slot]) next.equipment[item.slot] = item.id;
        tx.update(studentRef, { cash: (s.cash || 0) - total, rpg: next });
        if (tax > 0) {
          tx.set(doc(db, 'classes', klass.id, 'taxLedger', TAX_LEDGER_ID), {
            pending: increment(tax),
            item: increment(tax),
            updatedAt: Date.now(),
          }, { merge: true });
        }
      });
      flash('ok', `🛒 '${item.name}' 구매 완료!`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const refreshShop = async () => {
    if (busyId) return;
    if (refreshes >= HERO_SHOP_REFRESH_LIMIT) {
      flash('err', '오늘 상점 새로고침을 모두 사용했어요. 내일 다시 이용해 주세요.');
      return;
    }
    setBusyId('refresh');
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const current = normalizeHero(s.rpg);
        const used = current.shop.date === today ? current.shop.refreshes : 0;
        if (used >= HERO_SHOP_REFRESH_LIMIT) throw new Error('오늘 상점 새로고침을 모두 사용했어요.');
        tx.update(studentRef, {
          rpg: { ...current, shop: { date: today, refreshes: used + 1 } },
        });
      });
      flash('ok', `🔄 상점이 새로고침됐어요! 오늘 ${refreshes + 1}/${HERO_SHOP_REFRESH_LIMIT}회 사용`);
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
        else if (item.slot === 'pet') next.pet = item.id;
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
    const refundPrice = Math.floor(costOf(item) * 0.5);
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
        if (item.slot === 'pet' && next.pet === item.id) next.pet = null;
        if (item.slot !== 'pet' && next.equipment[item.slot] === item.id) delete next.equipment[item.slot];
        tx.update(studentRef, { cash: (s.cash || 0) + refundPrice, rpg: next });
      });
      flash('ok', `♻️ ${item.name} 환불 완료! 50%를 돌려받았어요.`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const card = (item, available = true) => {
    const owned = hero.owned.includes(item.id);
    const price = costOf(item);
    const tax = taxForPart(price, klass, 'item').tax;
    const total = price + tax;
    const equipped = item.slot === 'character'
      ? hero.character === item.id
      : item.slot === 'pet'
        ? hero.pet === item.id
        : hero.equipment[item.slot] === item.id;
    const locked = item.slot !== 'character' && !hero.character && !owned;
    const rarity = item.rarity ? HERO_RARITIES[item.rarity] : null;
    return (
      <div
        key={item.id}
        className={`relative overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-4 text-center shadow-lg transition hover:-translate-y-0.5 ${rarity?.surface || 'from-indigo-50 via-white to-pink-100'} ${rarity?.border || 'border-indigo-200'} ${owned ? 'ring-2 ring-emerald-300 ring-offset-2' : ''} ${!available ? 'opacity-70' : ''}`}
      >
        {rarity && <div className="absolute right-3 top-3 h-2 w-2 rounded-full" style={{ background: rarity.accent, boxShadow: `0 0 12px ${rarity.accent}` }} />}
        <HeroItemVisual item={item} size={96} className="mx-auto mb-2" />
        <div className="text-sm text-gray-700 whitespace-normal break-words leading-tight">{item.name}</div>
        <div className="flex justify-center gap-1 my-1">
          <HeroRarityBadge item={item} />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500">{item.level}단계</span>
        </div>
        <div className="text-xs text-indigo-500">
          {item.slot === 'pet' ? <>보스전 크리티컬 {item.critChance}% · 데미지 2배</> : <>전투력 +{item.power}</>}
        </div>
        {formatHeroSpecialStats(item).map((stat) => (
          <div key={stat} className="text-[10px] leading-tight text-fuchsia-500 whitespace-normal break-words">✨ {stat}</div>
        ))}
        <div className="text-xs text-amber-600 mb-2">{fmt(total)} {klass.currency}</div>
        {tax > 0 && <div className="text-[10px] text-gray-400 mb-1">상품 {fmt(price)} + 세금 {fmt(tax)}</div>}
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
              50% 환불 ({fmt(Math.floor(price * 0.5))})
            </button>
          </div>
        ) : (
          <button
            onClick={() => buy(item)}
            disabled={busyId === item.id || locked || !available || student.cash < total}
            className="w-full rounded-xl py-1.5 text-sm text-white bg-amber-400 hover:bg-amber-500 disabled:bg-gray-300"
          >
            {locked ? '캐릭터 먼저 구매' : available ? '구매하기' : '오늘 상점에 없음'}
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
      <div className="flex gap-2">
        <button onClick={() => setView('shop')} className={`rounded-xl px-3 py-1.5 text-sm ${view === 'shop' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-500'}`}>오늘 상점</button>
        <button onClick={() => setView('catalog')} className={`rounded-xl px-3 py-1.5 text-sm ${view === 'catalog' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-500'}`}>전체 20단계 도감</button>
      </div>
      <div className="rounded-2xl bg-amber-50 text-amber-700 px-4 py-3 text-sm flex items-center gap-2 flex-wrap">
        <span>내 현금: <b>{fmt(student.cash)} {klass.currency}</b> · {pricePolicyLabel(klass, klass.currency)} · 아이템마다 전투력이 올라가요.</span>
        <button onClick={refreshShop} disabled={!!busyId || refreshes >= HERO_SHOP_REFRESH_LIMIT} className="ml-auto rounded-xl px-3 py-1.5 bg-amber-500 text-white disabled:bg-gray-300">
          🔄 상점 새로고침 ({refreshes}/{HERO_SHOP_REFRESH_LIMIT})
        </button>
      </div>
      {msg && <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</div>}

      <section>
        <h3 className="text-lg text-gray-600 mb-2">🧙 캐릭터 선택</h3>
        <div className="grid grid-cols-2 gap-3">
          {characters.map((item) => {
            const previewHero = { ...hero, character: item.id };
            return (
              <div key={item.id} className="relative overflow-hidden rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-pink-100 p-4 text-center shadow-lg">
                <HeroPreview hero={previewHero} size={150} />
                <HeroItemVisual item={item} size={58} className="mx-auto -mt-7 border-white" />
                <div className="text-sm text-gray-700 mt-2 whitespace-normal break-words leading-tight">{item.name}</div>
                <div className="text-xs text-indigo-500">전투력 +{item.power}</div>
                <div className="text-xs text-amber-600 mb-2">총 {fmt(costOf(item) + taxForPart(costOf(item), klass, 'item').tax)} {klass.currency}</div>
                {hero.owned.includes(item.id) ? (
                  <div className="space-y-1">
                    <button onClick={() => equip(item)} disabled={busyId === item.id} className="w-full rounded-xl py-1.5 text-sm bg-indigo-100 text-indigo-600">{hero.character === item.id ? '장착 중 ✓' : '장착하기'}</button>
                    <button onClick={() => refund(item)} disabled={busyId === item.id} className="text-xs text-rose-500 underline">50% 환불</button>
                  </div>
                ) : (
                <button onClick={() => buy(item)} disabled={busyId === item.id || student.cash < costOf(item) + taxForPart(costOf(item), klass, 'item').tax} className="w-full rounded-xl py-1.5 text-sm text-white bg-amber-400 hover:bg-amber-500 disabled:bg-gray-300">구매하기</button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-lg text-fuchsia-600">🐾 {HERO_PET_SLOT[1]} 상점</h3>
          <span className="text-xs text-gray-400">1단계 5% · 20단계 80% 보스전 크리티컬</span>
        </div>
        <p className="mb-2 rounded-2xl bg-fuchsia-50 px-3 py-2 text-xs text-fuchsia-700">
          장착한 펫은 보스전에서 일정 확률로 데미지를 2배로 만들어요. 펫은 전투력에는 더하지 않아요.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(view === 'shop'
            ? HERO_PETS.filter((item) => shopIds.includes(item.id))
            : HERO_PETS
          ).map((item) => card(item, view === 'shop' && shopIds.includes(item.id)))}
        </div>
      </section>

      {HERO_SLOTS.map(([slot, label]) => (
        <section key={slot}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg text-gray-600">{label}</h3>
            <span className="text-xs text-gray-400">20단계 · 오늘 3개 판매</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(view === 'shop'
              ? HERO_ITEMS.filter((item) => item.slot === slot && shopIds.includes(item.id))
              : HERO_ITEMS.filter((item) => item.slot === slot)
            ).map((item) => card(item, view === 'shop' && shopIds.includes(item.id)))}
          </div>
        </section>
      ))}
    </div>
  );
}
