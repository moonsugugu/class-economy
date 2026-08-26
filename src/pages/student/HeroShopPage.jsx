import { useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { doc, runTransaction, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import {
  HERO_ITEMS, HERO_SLOTS, HERO_PETS, HERO_PET_SLOT, HERO_RARITIES, HERO_SHOP_REFRESH_LIMIT,
  normalizeHero, formatHeroSpecialStats, heroDateKey, heroShopFor, heroEnhancementFor,
} from '../../lib/hero';
import HeroCardVisual from '../../components/HeroCardVisual.jsx';
import { HeroItemVisual, HeroRarityBadge } from '../../components/HeroItemVisual.jsx';
import { itemPrice, pricePolicyLabel } from '../../lib/pricing';
import { TAX_LEDGER_ID, taxForPart } from '../../lib/taxes';

export default function HeroShopPage() {
  const { klass, student } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);
  const refundBusyRef = useRef(false);
  const requestedView = ['shop', 'catalog', 'inventory'].includes(searchParams.get('view'))
    ? searchParams.get('view')
    : 'shop';
  const [view, setView] = useState(requestedView);
  const hero = normalizeHero(student.rpg);
  const today = heroDateKey();
  const refreshes = hero.shop.date === today ? hero.shop.refreshes : 0;
  const shopIds = Object.values(heroShopFor(klass.id, today, refreshes)).flat();
  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const characters = HERO_ITEMS.filter((item) => item.slot === 'character');
  const inventoryItems = HERO_ITEMS.filter((item) => hero.owned.includes(item.id));
  const costOf = (item) => itemPrice(item.price, klass);
  const isEquipped = (current, itemId) => (
    current.character === itemId
    || current.pet === itemId
    || Object.values(current.equipment || {}).includes(itemId)
  );
  const slotLabelOf = (item) => (
    item.slot === 'character'
      ? '캐릭터'
      : item.slot === 'pet'
        ? '펫'
        : HERO_SLOTS.find(([slot]) => slot === item.slot)?.[1] || '같은 부위'
  );
  const refundBlockedMessage = (item) => (
    `장착 중인 ${slotLabelOf(item)}는 환불할 수 없어요. 같은 부위의 다른 장비를 먼저 장착해 주세요.`
  );

  const changeView = (nextView) => {
    setView(nextView);
    setSearchParams(nextView === 'shop' ? {} : { view: nextView });
  };

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
    if (refundBusyRef.current) return;
    if (isEquipped(hero, item.id)) {
      flash('err', refundBlockedMessage(item));
      return;
    }
    const enhancement = heroEnhancementFor(hero, item.id);
    const refundPrice = Math.floor((costOf(item) + enhancement.invested) * 0.5);
    if (!confirm(`'${item.name}'을(를) ${refundPrice}${klass.currency}에 환불할까요?`)) return;
    refundBusyRef.current = true;
    setBusyId(item.id);
    try {
      let refundResult = refundPrice;
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const current = normalizeHero(s.rpg);
        const settings = { ...klass, ...((await tx.get(doc(db, 'classes', klass.id))).data() || {}) };
        const currentPrice = itemPrice(item.price, settings);
        const currentEnhancement = heroEnhancementFor(current, item.id);
        refundResult = Math.floor((currentPrice + currentEnhancement.invested) * 0.5);
        if (!current.owned.includes(item.id)) throw new Error('환불할 아이템을 찾지 못했어요.');
        if (isEquipped(current, item.id)) throw new Error(refundBlockedMessage(item));
        const next = {
          ...current,
          owned: current.owned.filter((id) => id !== item.id),
          character: current.character === item.id ? null : current.character,
          equipment: Object.fromEntries(
            Object.entries(current.equipment || {}).filter(([, equippedId]) => equippedId !== item.id),
          ),
          enhancements: Object.fromEntries(
            Object.entries(current.enhancements || {}).filter(([itemId]) => itemId !== item.id),
          ),
        };
        if (item.slot === 'pet' && next.pet === item.id) next.pet = null;
        tx.update(studentRef, { cash: (s.cash || 0) + refundResult, rpg: next });
      });
      flash('ok', `♻️ ${item.name} 환불 완료! 50%를 돌려받았어요.`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      refundBusyRef.current = false;
      setBusyId(null);
    }
  };

  const card = (item, available = true) => {
    const owned = hero.owned.includes(item.id);
    const enhancement = heroEnhancementFor(hero, item.id);
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
        className={`hero-shop-card relative overflow-hidden rounded-3xl border-2 p-4 text-center shadow-lg transition hover:-translate-y-0.5 ${rarity ? `hero-shop-rarity-${item.rarity}` : 'hero-shop-character'} ${owned ? 'ring-2 ring-emerald-300 ring-offset-2' : ''} ${!available ? 'opacity-70' : ''}`}
      >
        {rarity && <div className="absolute right-3 top-3 h-2 w-2 rounded-full" style={{ background: rarity.accent, boxShadow: `0 0 12px ${rarity.accent}` }} />}
        <HeroItemVisual item={item} size={96} className="mx-auto mb-2" />
        <div className="hero-shop-item-name text-sm text-gray-700 whitespace-normal break-words leading-tight">{item.name}</div>
        <div className="hero-shop-item-meta flex justify-center gap-1 my-1">
          <HeroRarityBadge item={item} />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500">{item.level}단계</span>
        </div>
        <div className="hero-shop-item-power text-xs text-indigo-500">
          {item.slot === 'pet' ? <>보스전 크리티컬 {item.critChance}% · 치명타 시 2배</> : <>전투력 +{item.power}</>}
        </div>
        {formatHeroSpecialStats(item).map((stat) => (
          <div key={stat} className="hero-shop-item-effect text-[10px] leading-tight text-fuchsia-500 whitespace-normal break-words">✦ {stat}</div>
        ))}
        <div className="hero-shop-item-price text-xs text-amber-600 mb-2">{fmt(total)} {klass.currency}</div>
        {tax > 0 && <div className="hero-shop-item-tax text-[10px] text-gray-400 mb-1">상품 {fmt(price)} + 세금 {fmt(tax)}</div>}
        {owned ? (
          <div className="space-y-1">
            <button
              onClick={() => equip(item)}
              disabled={busyId === item.id}
              className={`w-full rounded-xl py-1.5 text-sm ${equipped ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}
            >
              {equipped ? '장착 중 ✓' : '장착하기'}
            </button>
            {equipped ? (
              <span className="block text-[10px] leading-tight text-gray-400">🔒 다른 {slotLabelOf(item)} 장착 후 환불 가능</span>
            ) : (
              <button onClick={() => refund(item)} disabled={busyId === item.id} className="text-xs text-rose-500 underline">
                50% 환불 ({fmt(Math.floor((price + enhancement.invested) * 0.5))})
              </button>
            )}
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
      <p className="text-sm text-gray-400">모든 아이템은 카드 실루엣으로 성장하고, 장착한 장비의 패시브 효과가 전투에 반영돼요.</p>
        </div>
        <Link to="/student/hero" className="ml-auto text-sm text-indigo-500 underline">← 용사 화면</Link>
      </div>
      <div className="flex gap-2">
        <button onClick={() => changeView('inventory')} className={`rounded-xl px-3 py-1.5 text-sm ${view === 'inventory' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500'}`}>📦 내 인벤토리 ({inventoryItems.length})</button>
        <button onClick={() => changeView('shop')} className={`rounded-xl px-3 py-1.5 text-sm ${view === 'shop' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-500'}`}>오늘 상점</button>
        <button onClick={() => changeView('catalog')} className={`rounded-xl px-3 py-1.5 text-sm ${view === 'catalog' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-500'}`}>전체 20단계 도감</button>
      </div>
      {view === 'inventory' && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          📦 구매한 아이템만 모아 두었어요. 장착하거나 구매가의 50%로 환불할 수 있어요. 장착 중인 아이템은 같은 부위의 다른 장비를 장착한 뒤 환불할 수 있고, 강화한 아이템은 누적 강화 투자액도 환불가에 포함돼요.
        </div>
      )}
      <div className="rounded-2xl bg-amber-50 text-amber-700 px-4 py-3 text-sm flex items-center gap-2 flex-wrap">
        <span>내 현금: <b>{fmt(student.cash)} {klass.currency}</b> · {pricePolicyLabel(klass, klass.currency)} · 구매 후 장착해야 패시브가 적용돼요.</span>
        <button onClick={refreshShop} disabled={!!busyId || refreshes >= HERO_SHOP_REFRESH_LIMIT} className="ml-auto rounded-xl px-3 py-1.5 bg-amber-500 text-white disabled:bg-gray-300">
          🔄 상점 새로고침 ({refreshes}/{HERO_SHOP_REFRESH_LIMIT})
        </button>
      </div>
      {msg && <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</div>}

      <section>
        <h3 className="text-lg text-gray-600 mb-2">🧙 캐릭터 선택</h3>
        <div className="grid grid-cols-2 gap-3">
          {characters.filter((item) => view !== 'inventory' || hero.owned.includes(item.id)).map((item) => {
            const previewHero = { ...hero, character: item.id };
            const equipped = hero.character === item.id;
            return (
              <div key={item.id} className="hero-shop-card hero-shop-character relative overflow-hidden rounded-3xl border-2 p-4 text-center shadow-lg">
                <HeroCardVisual hero={previewHero} size={150} />
                <HeroItemVisual item={item} size={58} className="mx-auto -mt-7 border-white" />
                <div className="hero-shop-item-name text-sm text-gray-700 mt-2 whitespace-normal break-words leading-tight">{item.name}</div>
                <div className="hero-shop-item-power text-xs text-indigo-500">전투력 +{item.power}</div>
                <div className="hero-shop-item-price text-xs text-amber-600 mb-2">총 {fmt(costOf(item) + taxForPart(costOf(item), klass, 'item').tax)} {klass.currency}</div>
                {hero.owned.includes(item.id) ? (
                  <div className="space-y-1">
                    <button onClick={() => equip(item)} disabled={busyId === item.id} className="w-full rounded-xl py-1.5 text-sm bg-indigo-100 text-indigo-600">{equipped ? '장착 중 ✓' : '장착하기'}</button>
                    {equipped ? (
                      <span className="block text-[10px] leading-tight text-gray-400">🔒 다른 캐릭터 장착 후 환불 가능</span>
                    ) : (
                      <button onClick={() => refund(item)} disabled={busyId === item.id} className="text-xs text-rose-500 underline">50% 환불</button>
                    )}
                  </div>
                ) : (
                <button onClick={() => buy(item)} disabled={busyId === item.id || student.cash < costOf(item) + taxForPart(costOf(item), klass, 'item').tax} className="w-full rounded-xl py-1.5 text-sm text-white bg-amber-400 hover:bg-amber-500 disabled:bg-gray-300">구매하기</button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="hero-shop-guide rounded-3xl px-4 py-3">
        <div className="hero-shop-guide-title">CARD RPG LOADOUT</div>
        <div className="hero-shop-guide-grid">
          <span><b>6단계 이상</b><small>장비 패시브 개방</small></span>
          <span><b>장착 중인 장비</b><small>전투력·승률·보스 피해에 반영</small></span>
          <span><b>강화 +10</b><small>누적 투자액이 환불 가치에 반영</small></span>
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-lg text-fuchsia-600">🐾 {HERO_PET_SLOT[1]} 상점</h3>
          <span className="text-xs text-gray-400">1단계 5% · 20단계 80% 보스전 크리티컬</span>
        </div>
        <p className="mb-2 rounded-2xl bg-fuchsia-50 px-3 py-2 text-xs text-fuchsia-700">
          장착한 펫은 보스전에서 일정 확률로 치명타를 발생시켜요. 치명타가 터진 순간에만 기본 2배 피해를 주고, 치명타 피해 +5%가 붙으면 2.05배가 됩니다. 일반 몬스터 공격과 일반 피해에는 2배가 적용되지 않아요. 펫의 기본 전투력은 0이지만 강화로 얻은 전투력과 패시브는 반영돼요.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(view === 'inventory'
            ? HERO_PETS.filter((item) => hero.owned.includes(item.id))
            : view === 'shop'
              ? HERO_PETS.filter((item) => shopIds.includes(item.id))
              : HERO_PETS
          ).map((item) => card(item, view === 'inventory' || (view === 'shop' && shopIds.includes(item.id))))}
        </div>
        {view === 'inventory' && !HERO_PETS.some((item) => hero.owned.includes(item.id)) && (
          <p className="py-6 text-center text-sm text-gray-400">구매한 펫이 아직 없어요.</p>
        )}
      </section>

      {HERO_SLOTS.map(([slot, label]) => (
        <section key={slot}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg text-gray-600">{label}</h3>
            <span className="text-xs text-gray-400">{view === 'inventory' ? `${inventoryItems.filter((item) => item.slot === slot).length}개 보유` : '20단계 · 오늘 3개 판매'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(view === 'inventory'
              ? HERO_ITEMS.filter((item) => item.slot === slot && hero.owned.includes(item.id))
              : view === 'shop'
                ? HERO_ITEMS.filter((item) => item.slot === slot && shopIds.includes(item.id))
                : HERO_ITEMS.filter((item) => item.slot === slot)
            ).map((item) => card(item, view === 'inventory' || (view === 'shop' && shopIds.includes(item.id))))}
          </div>
          {view === 'inventory' && !inventoryItems.some((item) => item.slot === slot) && (
            <p className="py-6 text-center text-sm text-gray-400">구매한 {label}이(가) 아직 없어요.</p>
          )}
        </section>
      ))}
    </div>
  );
}
