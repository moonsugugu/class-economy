import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import { itemPrice } from '../../lib/pricing';
import {
  HERO_ITEM_MAP, HERO_SLOTS, normalizeHero, heroBattlePower, heroBattleProfile,
  monsterForLevel, heroBattleChance, battleConfig, heroDateKey, battleDamage, bossCriticalChance, heroBattleWinReward,
  criticalDamageBonus, bossCriticalMultiplier, formatHeroSpecialStats, heroExtraBattleCost, heroDisplayName,
  HERO_ENHANCEMENT_MAX_LEVEL, heroEnhancementCost, heroEnhancementSuccessRate, heroEnhancementFor,
  heroEnhancementStats, heroItemPower,
} from '../../lib/hero';
import HeroCardVisual from '../../components/HeroCardVisual.jsx';
import { HeroItemVisual } from '../../components/HeroItemVisual.jsx';
import HeroBattleArena from '../../components/HeroBattleArena.jsx';
import MonsterVisual from '../../components/MonsterVisual.jsx';
import VictoryFireworks from '../../components/VictoryFireworks.jsx';

export default function HeroPage() {
  const { klass, student } = useOutletContext();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [battlePhase, setBattlePhase] = useState('idle');
  const [battleFx, setBattleFx] = useState(null);
  const [fireworks, setFireworks] = useState(false);
  const [enhancementItemId, setEnhancementItemId] = useState(null);
  const [enhancementBusy, setEnhancementBusy] = useState(false);
  const hero = normalizeHero(student.rpg);
  const battleProfile = heroBattleProfile(hero);
  const power = battleProfile.power;
  const today = heroDateKey();
  const config = battleConfig(klass);
  const usedToday = hero.battleDate === today ? hero.battleCount : 0;
  const extraAttempts = Math.max(0, usedToday - config.limit);
  const extraCostPreview = heroExtraBattleCost(usedToday, config.limit);
  const nextMonster = hero.clearedLevel < 100 ? monsterForLevel(hero.clearedLevel + 1) : null;
  const nextWinReward = nextMonster ? heroBattleWinReward(nextMonster.level, nextMonster.boss, config.winReward) : 0;
  const finalBossReward = heroBattleWinReward(100, true, config.winReward);
  const bossProgress = nextMonster?.boss ? Math.min(nextMonster.maxHp, hero.bossProgress[nextMonster.level] || 0) : 0;
  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const classRef = doc(db, 'classes', klass.id);
  const enhancementItem = enhancementItemId ? HERO_ITEM_MAP[enhancementItemId] : null;
  const enhancement = enhancementItem ? heroEnhancementFor(hero, enhancementItem.id) : null;
  const enhancementTarget = enhancement ? enhancement.level + 1 : 0;
  const enhancementCost = enhancementTarget <= HERO_ENHANCEMENT_MAX_LEVEL
    ? heroEnhancementCost(enhancementTarget)
    : 0;
  const enhancementChance = enhancementTarget <= HERO_ENHANCEMENT_MAX_LEVEL
    ? heroEnhancementSuccessRate(enhancementTarget)
    : 0;

  const isEquipped = (itemId, current = hero) => (
    current.character === itemId || current.pet === itemId || Object.values(current.equipment || {}).includes(itemId)
  );

  const renameHero = async () => {
    if (busy || !hero.character) return;
    const proposed = window.prompt('용사의 새 이름을 입력해 주세요. (최대 20자)', hero.name || '용사');
    if (proposed === null) return;
    const name = proposed.trim();
    if (!name) {
      setMsg({ type: 'err', text: '이름을 한 글자 이상 입력해 주세요.' });
      return;
    }
    if (name.length > 20) {
      setMsg({ type: 'err', text: '용사 이름은 20자까지 입력할 수 있어요.' });
      return;
    }
    const previewCost = hero.nameChangeCount > 0 ? 1000 : 0;
    if (previewCost > 0 && !window.confirm(`이름을 바꾸려면 ${fmt(previewCost)}${klass.currency}가 필요해요. 바꿀까요?`)) return;
    setBusy(true);
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const current = normalizeHero(s.rpg);
        const cost = current.nameChangeCount > 0 ? 1000 : 0;
        if (cost > previewCost) throw new Error('이름 변경 상태가 바뀌었어요. 다시 시도해 주세요.');
        const cash = Number(s.cash) || 0;
        if (cash < cost) throw new Error(`이름 변경에는 ${fmt(cost)}${klass.currency}가 필요해요.`);
        const update = {
          rpg: { ...current, name, nameChangeCount: current.nameChangeCount + 1 },
        };
        if (cost > 0) update.cash = Math.round((cash - cost) * 100) / 100;
        tx.update(studentRef, update);
      });
      setMsg({ type: 'ok', text: previewCost > 0 ? `✏️ 용사 이름을 바꿨어요. ${fmt(previewCost)}${klass.currency}를 사용했어요.` : '✏️ 첫 용사 이름 변경은 무료예요!' });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const enhanceItem = async () => {
    if (!enhancementItem || enhancementBusy || !enhancement) return;
    if (enhancementTarget > HERO_ENHANCEMENT_MAX_LEVEL) return;
    if (!window.confirm(
      `${enhancementItem.name} +${enhancementTarget}강에 도전할까요?\n` +
      `비용 ${fmt(enhancementCost)}${klass.currency} · 성공 확률 ${enhancementChance}%\n` +
      `실패해도 사용한 비용은 아이템 가치에 누적됩니다.`
    )) return;
    const roll = Math.random();
    setEnhancementBusy(true);
    try {
      let result;
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data() || {};
        const current = normalizeHero(s.rpg);
        const item = HERO_ITEM_MAP[enhancementItem.id];
        const currentEnhancement = heroEnhancementFor(current, item.id);
        const targetLevel = currentEnhancement.level + 1;
        const cost = heroEnhancementCost(targetLevel);
        const successRate = heroEnhancementSuccessRate(targetLevel);
        if (!current.owned.includes(item.id) || !isEquipped(item.id, current)) {
          throw new Error('장착 중인 아이템만 강화할 수 있어요.');
        }
        if (targetLevel > HERO_ENHANCEMENT_MAX_LEVEL) throw new Error('이미 +10강이에요.');
        if ((Number(s.cash) || 0) < cost) throw new Error(`${fmt(cost)}${klass.currency}가 필요해요.`);
        const success = roll < successRate / 100;
        const nextLevel = success ? targetLevel : currentEnhancement.level;
        const specialAbility = nextLevel >= HERO_ENHANCEMENT_MAX_LEVEL
          ? currentEnhancement.specialAbility || {
            key: 'enhancementPower',
            label: '강화 특수능력',
            value: 10,
          }
          : currentEnhancement.specialAbility;
        const nextEnhancement = {
          ...currentEnhancement,
          level: nextLevel,
          invested: currentEnhancement.invested + cost,
          attempts: currentEnhancement.attempts + 1,
          specialAbility,
        };
        tx.update(studentRef, {
          cash: (Number(s.cash) || 0) - cost,
          rpg: {
            ...current,
            enhancements: { ...current.enhancements, [item.id]: nextEnhancement },
          },
        });
        result = { success, targetLevel, cost, successRate, nextLevel, invested: nextEnhancement.invested };
      });
      setMsg({
        type: result.success ? 'ok' : 'err',
        text: result.success
          ? `✨ ${enhancementItem.name} +${result.targetLevel}강 성공! 현재 +${result.nextLevel}강 · 누적 가치 ${fmt(result.invested)}${klass.currency}`
          : `💥 +${result.targetLevel}강 실패했어요. 사용한 ${fmt(result.cost)}${klass.currency}는 아이템 가치에 누적됐어요.`,
      });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setEnhancementBusy(false);
    }
  };

  const battle = async () => {
    if (busy || !nextMonster) return;
    if (!hero.character) {
      setMsg({ type: 'err', text: '먼저 용사키우기 상점에서 남자 또는 여자 용사를 구매해 주세요.' });
      return;
    }
    const needsExtraAttempt = usedToday >= config.limit;
    if (needsExtraAttempt && !window.confirm(
      `오늘 기본 도전 ${config.limit}회를 모두 사용했어요.\n` +
      `이번 추가 도전에는 ${extraCostPreview}${klass.currency}를 지불하고 도전할까요?`
    )) return;
    setBusy(true);
    setBattlePhase('charge');
    const roll = Math.random();
    try {
      await new Promise((resolve) => setTimeout(resolve, 280));
      setBattlePhase('attack');
      let battleResult;
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const settings = battleConfig((await tx.get(classRef)).data() || klass);
        const current = normalizeHero(s.rpg);
        const level = current.clearedLevel + 1;
        if (level > 100) throw new Error('이미 100단계까지 모두 정복했어요!');
        const attempts = current.battleDate === today ? current.battleCount : 0;
        const extraAttempt = attempts >= settings.limit;
        if (extraAttempt && !needsExtraAttempt) {
          throw new Error('기본 도전 횟수가 방금 소진됐어요. 추가 도전 버튼을 다시 눌러 주세요.');
        }
        const extraCost = extraAttempt ? heroExtraBattleCost(attempts, settings.limit) : 0;
        const currentCash = Number(s.cash) || 0;
        if (extraCost > 0 && currentCash < extraCost) {
          throw new Error(`추가 도전에는 ${extraCost}${klass.currency}가 필요해요.`);
        }
        const monster = monsterForLevel(level);
        const currentPower = heroBattlePower(current);
        const chance = heroBattleChance(currentPower, monster.power, current);
        const won = roll < chance;
        const damageResult = won
          ? battleDamage(currentPower, monster, current)
          : { damage: 0, critical: false, criticalChance: bossCriticalChance(current), criticalDamage: criticalDamageBonus(current), bossDamage: 0 };
        const previousBossDamage = current.bossProgress[monster.level] || 0;
        const nextBossDamage = monster.boss
          ? Math.min(monster.maxHp, previousBossDamage + damageResult.damage)
          : previousBossDamage;
        const bossDefeated = !monster.boss || nextBossDamage >= monster.maxHp;
        // 보스는 데미지를 넣을 때마다 상금을 주지 않고, 마지막 처치 시도에만 승리 상금을 줍니다.
        const reward = won && bossDefeated
          ? heroBattleWinReward(monster.level, monster.boss, settings.winReward)
          : won
            ? 0
            : settings.loseReward;
        const nextHero = {
          ...current,
          clearedLevel: won && bossDefeated ? level : current.clearedLevel,
          bossProgress: monster.boss
            ? { ...current.bossProgress, [level]: nextBossDamage }
            : current.bossProgress,
          battleDate: today,
          battleCount: attempts + 1,
          lastBattle: {
            level,
            won,
            power: currentPower,
            monsterPower: monster.power,
            reward,
            damage: damageResult.damage,
            critical: damageResult.critical,
            criticalDamage: damageResult.criticalDamage,
            criticalMultiplier: damageResult.criticalMultiplier,
            bossDamageBonus: damageResult.bossDamage || 0,
            bossDamage: nextBossDamage,
            bossHp: monster.maxHp,
            bossDefeated,
            attempt: attempts + 1,
            at: Date.now(),
          },
        };
        const update = { rpg: nextHero };
        if (extraCost > 0 || reward > 0) {
          update.cash = Math.round((currentCash - extraCost + reward) * 100) / 100;
        }
        tx.update(studentRef, update);
        battleResult = {
          won, monster, chance, currentPower, reward,
          damage: damageResult.damage, critical: damageResult.critical,
          criticalDamage: damageResult.criticalDamage,
          criticalMultiplier: damageResult.criticalMultiplier,
          bossDamageBonus: damageResult.bossDamage || 0,
          bossDamage: nextBossDamage, bossHp: monster.maxHp, bossDefeated,
          attempt: attempts + 1, limit: settings.limit, extraCost,
        };
      });
      setBattleFx(battleResult);
      setBattlePhase(battleResult.won ? 'win' : 'lose');
      setTimeout(() => setBattlePhase('idle'), 2800);
      if (battleResult.won) {
        setFireworks(true);
        setTimeout(() => setFireworks(false), 3000);
      }
      const costText = battleResult.extraCost > 0
        ? ` 추가 도전 비용 ${fmt(battleResult.extraCost)}${klass.currency}를 냈어요.`
        : '';
      setMsg(battleResult.won
        ? { type: 'ok', text: `🎉 ${battleResult.monster.name}을(를) 물리쳤어요! ${fmt(battleResult.reward)}${klass.currency}를 받았어요.${costText} (${battleResult.attempt}/${battleResult.limit}회)` }
        : { type: 'err', text: `💥 아쉽게 졌어요. 승리 확률은 ${Math.round(battleResult.chance * 100)}%였어요. ${battleResult.reward > 0 ? `${fmt(battleResult.reward)}${klass.currency}를 받았어요.` : '패배 보상은 0이에요.'}${costText} (${battleResult.attempt}/${battleResult.limit}회)` });
      if (battleResult.won && battleResult.monster.boss) {
        setMsg({
          type: 'ok',
          text: '💥 ' + battleResult.monster.name + '에게 ' + fmt(battleResult.damage) + ' 데미지' +
            (battleResult.critical ? ` (크리티컬 ${(battleResult.criticalMultiplier || bossCriticalMultiplier(hero)).toFixed(2).replace(/\.00$/, '')}배!)` : '') + '! ' +
            (battleResult.bossDefeated ? '보스를 쓰러뜨렸어요!' : '아직 보스 HP가 남았어요.') +
            ' 보상 ' + fmt(battleResult.reward) + klass.currency +
            (battleResult.extraCost > 0 ? ' · 추가 도전 비용 ' + fmt(battleResult.extraCost) + klass.currency : '') +
            ' (' + battleResult.attempt + '/' + battleResult.limit + '회)',
        });
      }
    } catch (e) {
      setBattlePhase('idle');
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <VictoryFireworks active={fireworks} />
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl text-indigo-600">⚔️ 용사키우기</h2>
          <p className="text-sm text-gray-400">장비를 돈으로 사고 전투력으로 100단계 몬스터에 도전해요.</p>
        </div>
        <Link to="/student/hero/shop" className="ml-auto rounded-2xl px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white shadow">
          🛒 용사 상점
        </Link>
      </div>

      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      <div className="hero-page-columns grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="hero-profile-panel hero-profile-panel-tall text-white rounded-3xl shadow-lg p-5 text-center">
          <div
            className={`hero-profile-visual-stage flex w-full justify-center ${hero.character ? 'cursor-pointer' : ''}`}
            onClick={() => hero.character && setEnhancementItemId(hero.character)}
            title={hero.character ? '캐릭터를 눌러 강화' : undefined}
          >
            {hero.character ? <HeroCardVisual hero={hero} size={300} /> : <div className="h-[300px] w-[300px] rounded-2xl bg-white/15 flex items-center justify-center text-7xl">❔</div>}
          </div>
          {hero.character ? (
            <>
              <button
                onClick={renameHero}
                disabled={busy}
                className="text-xl font-semibold hover:text-amber-200 disabled:opacity-60"
                title="클릭해서 용사 이름 바꾸기"
              >
                {heroDisplayName(hero)} ✏️
              </button>
              <div className="text-xs text-white/60">{HERO_ITEM_MAP[hero.character]?.name} · 이름 변경 1회 무료, 이후 {fmt(1000)}{klass.currency}</div>
            </>
          ) : <div className="text-xl">아직 용사가 없어요</div>}
          <div className="text-white/70 text-sm mt-1">카드 전투력</div>
          <div className="text-5xl font-bold tabular-nums">{fmt(power)}</div>
          <div className="hero-profile-effects mt-3" aria-label="장착 장비 효과">
            <div className="hero-profile-effect-title">EQUIPMENT SYNERGY</div>
            <div className="hero-profile-effect-grid">
              <span><small>공명 전투력</small><b>+{battleProfile.powerBonus}%</b></span>
              <span><small>승률 보너스</small><b>+{battleProfile.chanceBonus}%</b></span>
              <span><small>보스 피해</small><b>+{battleProfile.bossDamageBonus}%</b></span>
              <span><small>보스 크리</small><b>{battleProfile.criticalChance}%</b></span>
            </div>
          </div>
          <div className="mt-3 text-sm bg-white/15 rounded-xl px-3 py-2">정복 단계 {hero.clearedLevel} / 100</div>
          <div className="mt-1 text-xs text-amber-100/90">최종 보스 처치 시 보상 {fmt(finalBossReward)}{klass.currency}</div>
        </div>

        <div className="hero-loadout-panel bg-white rounded-3xl shadow p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-lg text-gray-600">🧰 장착 장비</h3>
            <span className="hero-loadout-count">{HERO_SLOTS.filter(([slot]) => hero.equipment[slot]).length}/6 슬롯</span>
          </div>
          <div className="space-y-2">
            {HERO_SLOTS.map(([slot, label]) => {
              const item = HERO_ITEM_MAP[hero.equipment[slot]];
              const itemEnhancement = item ? heroEnhancementFor(hero, item.id) : null;
              const enhancementStats = item ? heroEnhancementStats(hero, item.id) : [];
              const specialStats = formatHeroSpecialStats(item).map((stat) => stat
                .replace('보스전 크리티컬 확률', '치명타 확률')
                .replace('크리티컬 데미지', '치명타 피해'));
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => item && setEnhancementItemId(item.id)}
                  disabled={!item}
                  className={`hero-loadout-row flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-2xl border px-2 py-1.5 text-left ${item ? 'border-indigo-100 bg-indigo-50/40 hover:border-indigo-300' : 'border-gray-100 bg-gray-50'}`}
                >
                  <span className="w-12 shrink-0 whitespace-nowrap text-[9px] text-gray-400">{label}</span>
                  <HeroItemVisual item={item} size={44} showLevel={false} />
                  <span className="min-w-0 flex-1 overflow-hidden text-gray-600">
                    <span className="block truncate text-[10px] leading-tight">{item?.name || '미장착'}</span>
                    {item && <span className="block text-[8px] font-semibold leading-tight text-indigo-500">{item.level}단계 장비 · +{itemEnhancement.level}강</span>}
                    {specialStats.map((stat) => <span key={stat} title={stat} className="block break-words text-[8px] leading-tight tracking-[-0.04em] text-fuchsia-500">✨ {stat}</span>)}
                    {enhancementStats.map((stat) => <span key={stat.key} className="block break-words text-[8px] leading-tight text-amber-600">✨ {stat.label} +{stat.value}</span>)}
                  </span>
                  <span className="w-11 shrink-0 text-right text-[9px] text-indigo-500">{item ? `+${heroItemPower(item, itemEnhancement)}` : ''}<small className="block text-[7px] leading-tight text-gray-400">전투력</small></span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => hero.pet && setEnhancementItemId(hero.pet)}
              disabled={!hero.pet}
              className={['hero-loadout-row hero-loadout-pet grid w-full min-w-0 grid-cols-[2.25rem_2.75rem_minmax(0,1fr)_6.5rem] items-center gap-2 overflow-hidden rounded-2xl border px-2 py-1.5 text-left', hero.pet ? 'border-fuchsia-200 bg-fuchsia-50 hover:border-fuchsia-300' : 'border-gray-100 bg-gray-50'].join(' ')}
            >
              {(() => {
                const pet = HERO_ITEM_MAP[hero.pet];
                const petEnhancement = pet ? heroEnhancementFor(hero, pet.id) : null;
                const petEnhancementStats = pet ? heroEnhancementStats(hero, pet.id) : [];
                return (
                  <>
              <span className="whitespace-nowrap text-[9px] text-gray-400">펫</span>
              <HeroItemVisual item={pet} size={44} showLevel={false} />
              <span className="min-w-0 overflow-hidden text-gray-600">
                <span className="block truncate break-keep text-[10px] leading-tight">{pet?.name || '미장착'}</span>
                {pet && <span className="block text-[8px] font-semibold leading-tight text-fuchsia-500">{pet.level}단계 펫 · +{petEnhancement.level}강</span>}
                {petEnhancementStats.map((stat) => <span key={stat.key} className="block break-words text-[8px] leading-tight text-amber-600">✨ {stat.label} +{stat.value}</span>)}
              </span>
              <span className="min-w-0 text-right text-[8px] leading-tight text-fuchsia-600 [word-break:keep-all]">
                {bossCriticalChance(hero) > 0 && <span className="block">치명타 확률 {bossCriticalChance(hero)}%</span>}
                <small className="block text-[8px] text-gray-400">치명타 시 보스 피해 ×2</small>
                {criticalDamageBonus(hero) > 0 && <small className="block text-[8px] text-fuchsia-400">치명타 피해 +{criticalDamageBonus(hero)}%</small>}
                {pet && <small className="block text-[8px] text-indigo-500">전투력 +{heroItemPower(pet, petEnhancement)}</small>}
              </span>
                  </>
                );
              })()}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-gray-400">장착 아이템을 누르면 강화 창이 열려요.</p>
          <Link to="/student/hero/shop?view=inventory" className="block text-center text-sm text-indigo-500 underline mt-1">내 장비 바꾸러 가기 →</Link>
        </div>
      </div>

      {nextMonster && hero.character && (
        <HeroBattleArena
          hero={hero}
          power={power}
          monster={nextMonster}
          phase={battlePhase}
          chance={heroBattleChance(power, nextMonster.power, hero)}
          bossDamage={bossProgress}
          battleFx={battleFx}
        />
      )}

      {nextMonster ? (
        <div className="hero-next-stage-card bg-white rounded-3xl shadow p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center"><MonsterVisual monster={nextMonster} size={72} /></div>
            <div>
              <div className="text-xs text-gray-400">NEXT · {nextMonster.level}단계 {nextMonster.boss ? '보스' : '몬스터'}</div>
              <h3 className="text-xl text-gray-700">{nextMonster.name}</h3>
              <div className="text-sm text-rose-500">몬스터 전투력 {fmt(nextMonster.power)}</div>
              {nextMonster.boss && (
                <div className="text-xs text-fuchsia-600">
                  보스 HP {fmt(Math.max(0, nextMonster.maxHp - bossProgress))} / {fmt(nextMonster.maxHp)}
                  {bossCriticalChance(hero) > 0 && <> · 펫 크리티컬 {bossCriticalChance(hero)}%</>}
                </div>
              )}
              <div className="text-xs text-amber-600">
                {nextMonster.boss ? `보스 처치 ${fmt(nextWinReward)}` : `승리 ${fmt(nextWinReward)}`} · 패배 {fmt(config.loseReward)} {klass.currency}
                {nextMonster.boss && <span className="ml-1 text-fuchsia-500">(데미지 보상 없음)</span>}
              </div>
            </div>
            <button
              onClick={battle}
              disabled={busy || !hero.character}
              className="ml-auto rounded-2xl px-5 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white shadow font-bold"
            >
              {busy ? '전투 중...' : usedToday >= config.limit ? `⚔️ 추가 도전 (${extraCostPreview}${klass.currency})` : '⚔️ 전투 시작'}
            </button>
          </div>
          {!hero.character && <p className="text-sm text-rose-500 mt-4">상점에서 캐릭터를 먼저 구매해야 전투할 수 있어요.</p>}
          <div className="text-xs text-gray-400 mt-3">
            오늘 기본 도전 {Math.min(usedToday, config.limit)} / {config.limit}회
            {extraAttempts > 0 && <> · 추가 도전 {extraAttempts}회</>}
            {' · '}장비 효과 포함 승률 {Math.round(heroBattleChance(power, nextMonster.power, hero) * 100)}%
            {usedToday >= config.limit && <> · 다음 추가 도전 {extraCostPreview}{klass.currency}</>}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 text-amber-700 rounded-3xl shadow p-6 text-center">🏆 100단계 정복 완료! 진정한 경제 용사예요.</div>
      )}

      {hero.lastBattle && (
        <div className="text-center text-xs text-gray-400">
          마지막 전투: {hero.lastBattle.level}단계 · {hero.lastBattle.won ? '승리' : '패배'} · 보상 {fmt(hero.lastBattle.reward || 0)} {klass.currency} · {new Date(hero.lastBattle.at).toLocaleString('ko-KR')}
        </div>
      )}

      {enhancementItem && enhancement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => !enhancementBusy && setEnhancementItemId(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3">
              <HeroItemVisual item={enhancementItem} size={72} />
              <div>
                <h3 className="text-xl font-bold text-indigo-700">{enhancementItem.name} 강화</h3>
                <p className="text-sm text-gray-500">현재 +{enhancement.level}강 · 누적 투자 {fmt(enhancement.invested)}{klass.currency}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-700">
              <div>아이템 가치: <b>{fmt(itemPrice(enhancementItem.price, klass) + enhancement.invested)}{klass.currency}</b></div>
              <div>환불 예상액: <b>{fmt(Math.floor((itemPrice(enhancementItem.price, klass) + enhancement.invested) * 0.5))}{klass.currency}</b></div>
            </div>
            {enhancementTarget <= HERO_ENHANCEMENT_MAX_LEVEL ? (
              <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-center justify-between"><b>+{enhancementTarget}강 도전</b><b>{fmt(enhancementCost)}{klass.currency}</b></div>
                <div>성공 확률 {enhancementChance}% · 실패해도 비용은 아이템 가치에 누적</div>
                {enhancementTarget === HERO_ENHANCEMENT_MAX_LEVEL && <div className="font-semibold text-fuchsia-600">성공하면 특수능력: 강화 전투력 +10</div>}
              </div>
            ) : (
              <div className="rounded-2xl bg-fuchsia-50 p-4 text-sm text-fuchsia-700">
                +10강 달성! 특수능력 강화 전투력 +10이 적용되어 있어요.
              </div>
            )}
            <div className="flex gap-2">
              {enhancementTarget <= HERO_ENHANCEMENT_MAX_LEVEL && (
                <button onClick={enhanceItem} disabled={enhancementBusy} className="flex-1 rounded-xl bg-amber-500 py-2 font-bold text-white disabled:bg-gray-300">
                  {enhancementBusy ? '강화 중...' : `+${enhancementTarget}강 도전`}
                </button>
              )}
              <button onClick={() => setEnhancementItemId(null)} disabled={enhancementBusy} className="flex-1 rounded-xl bg-gray-100 py-2 text-gray-500 disabled:opacity-50">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
