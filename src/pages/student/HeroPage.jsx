import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import {
  HERO_ITEM_MAP, HERO_SLOTS, normalizeHero, heroPower,
  monsterForLevel, battleChance, battleConfig, heroDateKey, battleDamage, bossCriticalChance,
} from '../../lib/hero';
import HeroPreview from '../../three/Hero3D.jsx';
import { HeroItemVisual } from '../../components/HeroItemVisual.jsx';
import HeroBattleArena from '../../components/HeroBattleArena.jsx';
import MonsterVisual from '../../components/MonsterVisual.jsx';

export default function HeroPage() {
  const { klass, student } = useOutletContext();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [battlePhase, setBattlePhase] = useState('idle');
  const [battleFx, setBattleFx] = useState(null);
  const hero = normalizeHero(student.rpg);
  const power = heroPower(hero);
  const today = heroDateKey();
  const config = battleConfig(klass);
  const usedToday = hero.battleDate === today ? hero.battleCount : 0;
  const nextMonster = hero.clearedLevel < 100 ? monsterForLevel(hero.clearedLevel + 1) : null;
  const bossProgress = nextMonster?.boss ? Math.min(nextMonster.maxHp, hero.bossProgress[nextMonster.level] || 0) : 0;
  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const classRef = doc(db, 'classes', klass.id);

  const battle = async () => {
    if (busy || !nextMonster) return;
    if (!hero.character) {
      setMsg({ type: 'err', text: '먼저 용사키우기 상점에서 남자 또는 여자 용사를 구매해 주세요.' });
      return;
    }
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
        if (attempts >= settings.limit) throw new Error(`오늘 전투 도전 횟수를 모두 사용했어요. (${settings.limit}회) 내일 다시 도전해 주세요.`);
        const monster = monsterForLevel(level);
        const currentPower = heroPower(current);
        const chance = battleChance(currentPower, monster.power);
        const won = roll < chance;
        const damageResult = won
          ? battleDamage(currentPower, monster, current)
          : { damage: 0, critical: false, criticalChance: bossCriticalChance(current) };
        const reward = won ? settings.winReward : settings.loseReward;
        const previousBossDamage = current.bossProgress[monster.level] || 0;
        const nextBossDamage = monster.boss
          ? Math.min(monster.maxHp, previousBossDamage + damageResult.damage)
          : previousBossDamage;
        const bossDefeated = !monster.boss || nextBossDamage >= monster.maxHp;
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
            bossDamage: nextBossDamage,
            bossHp: monster.maxHp,
            bossDefeated,
            attempt: attempts + 1,
            at: Date.now(),
          },
        };
        const update = { rpg: nextHero };
        if (reward > 0) update.cash = (s.cash || 0) + reward;
        tx.update(studentRef, update);
        battleResult = {
          won, monster, chance, currentPower, reward,
          damage: damageResult.damage, critical: damageResult.critical,
          bossDamage: nextBossDamage, bossHp: monster.maxHp, bossDefeated,
          attempt: attempts + 1, limit: settings.limit,
        };
      });
      setBattleFx(battleResult);
      setBattlePhase(battleResult.won ? 'win' : 'lose');
      setTimeout(() => setBattlePhase('idle'), 2800);
      setMsg(battleResult.won
        ? { type: 'ok', text: `🎉 ${battleResult.monster.name}을(를) 물리쳤어요! ${fmt(battleResult.reward)}${klass.currency}를 받았어요. (${battleResult.attempt}/${battleResult.limit}회)` }
        : { type: 'err', text: `💥 아쉽게 졌어요. 승리 확률은 ${Math.round(battleResult.chance * 100)}%였어요. ${battleResult.reward > 0 ? `${fmt(battleResult.reward)}${klass.currency}를 받았어요.` : '패배 보상은 0이에요.'} (${battleResult.attempt}/${battleResult.limit}회)` });
      if (battleResult.won && battleResult.monster.boss) {
        setMsg({
          type: 'ok',
          text: '💥 ' + battleResult.monster.name + '에게 ' + fmt(battleResult.damage) + ' 데미지' +
            (battleResult.critical ? ' (크리티컬 2배!)' : '') + '! ' +
            (battleResult.bossDefeated ? '보스를 쓰러뜨렸어요!' : '아직 보스 HP가 남았어요.') +
            ' 보상 ' + fmt(battleResult.reward) + klass.currency + ' (' + battleResult.attempt + '/' + battleResult.limit + '회)',
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

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl shadow-lg p-5 text-center">
          {hero.character ? <HeroPreview hero={hero} size={210} /> : <div className="h-[210px] rounded-2xl bg-white/15 flex items-center justify-center text-7xl">❔</div>}
          <div className="text-xl">{hero.character ? HERO_ITEM_MAP[hero.character]?.name : '아직 용사가 없어요'}</div>
          <div className="text-white/70 text-sm mt-1">현재 전투력</div>
          <div className="text-5xl font-bold tabular-nums">{fmt(power)}</div>
          <div className="mt-3 text-sm bg-white/15 rounded-xl px-3 py-2">정복 단계 {hero.clearedLevel} / 100</div>
        </div>

        <div className="bg-white rounded-3xl shadow p-5">
          <h3 className="text-lg text-gray-600 mb-3">🧰 장착 장비</h3>
          <div className="space-y-2">
            {HERO_SLOTS.map(([slot, label]) => {
              const item = HERO_ITEM_MAP[hero.equipment[slot]];
              return (
                <div key={slot} className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${item ? 'border-indigo-100 bg-indigo-50/40' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="text-xs text-gray-400 w-12">{label}</span>
                  <HeroItemVisual item={item} size={52} showLevel={false} />
                  <span className="text-sm text-gray-600">{item?.name || '미장착'}</span>
                  <span className="ml-auto text-right text-sm text-indigo-500">{item ? `+${item.power}` : ''}<small className="block text-[9px] text-gray-400">전투력</small></span>
                </div>
              );
            })}
            <div className={['flex items-center gap-3 rounded-2xl border px-3 py-2', hero.pet ? 'border-fuchsia-200 bg-fuchsia-50' : 'border-gray-100 bg-gray-50'].join(' ')}>
              <span className="text-xs text-gray-400 w-12">펫</span>
              <HeroItemVisual item={HERO_ITEM_MAP[hero.pet]} size={52} showLevel={false} />
              <span className="text-sm text-gray-600">{HERO_ITEM_MAP[hero.pet]?.name || '미장착'}</span>
              <span className="ml-auto text-right text-sm text-fuchsia-600">
                {HERO_ITEM_MAP[hero.pet] ? <>보스 크리티컬 {bossCriticalChance(hero)}%</> : ''}
                <small className="block text-[9px] text-gray-400">보스 데미지 2배</small>
              </span>
            </div>
          </div>
          <Link to="/student/hero/shop" className="block text-center text-sm text-indigo-500 underline mt-4">장비 바꾸러 가기 →</Link>
        </div>
      </div>

      {nextMonster && hero.character && (
        <HeroBattleArena
          hero={hero}
          power={power}
          monster={nextMonster}
          phase={battlePhase}
          chance={battleChance(power, nextMonster.power)}
          bossDamage={bossProgress}
          battleFx={battleFx}
        />
      )}

      {nextMonster ? (
        <div className="bg-white rounded-3xl shadow p-5">
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
              <div className="text-xs text-amber-600">승리 {fmt(config.winReward)} · 패배 {fmt(config.loseReward)} {klass.currency}</div>
            </div>
            <button
              onClick={battle}
              disabled={busy || !hero.character || usedToday >= config.limit}
              className="ml-auto rounded-2xl px-5 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white shadow font-bold"
            >
              {busy ? '전투 중...' : usedToday >= config.limit ? '오늘 도전 완료' : '⚔️ 전투 시작'}
            </button>
          </div>
          {!hero.character && <p className="text-sm text-rose-500 mt-4">상점에서 캐릭터를 먼저 구매해야 전투할 수 있어요.</p>}
          <div className="text-xs text-gray-400 mt-3">오늘 도전 {Math.min(usedToday, config.limit)} / {config.limit}회 · 전투력 비율 승률 {Math.round(battleChance(power, nextMonster.power) * 100)}%</div>
        </div>
      ) : (
        <div className="bg-amber-50 text-amber-700 rounded-3xl shadow p-6 text-center">🏆 100단계 정복 완료! 진정한 경제 용사예요.</div>
      )}

      {hero.lastBattle && (
        <div className="text-center text-xs text-gray-400">
          마지막 전투: {hero.lastBattle.level}단계 · {hero.lastBattle.won ? '승리' : '패배'} · 보상 {fmt(hero.lastBattle.reward || 0)} {klass.currency} · {new Date(hero.lastBattle.at).toLocaleString('ko-KR')}
        </div>
      )}
    </div>
  );
}
