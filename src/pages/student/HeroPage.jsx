import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import {
  HERO_ITEM_MAP, HERO_SLOTS, normalizeHero, heroPower,
  monsterForLevel, battleChance,
} from '../../lib/hero';

export default function HeroPage() {
  const { klass, student } = useOutletContext();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const hero = normalizeHero(student.rpg);
  const power = heroPower(hero);
  const nextMonster = hero.clearedLevel < 100 ? monsterForLevel(hero.clearedLevel + 1) : null;
  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);

  const battle = async () => {
    if (busy || !nextMonster) return;
    if (!hero.character) {
      setMsg({ type: 'err', text: '먼저 용사키우기 상점에서 남자 또는 여자 용사를 구매해 주세요.' });
      return;
    }
    setBusy(true);
    const roll = Math.random();
    try {
      let battleResult;
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const current = normalizeHero(s.rpg);
        const level = current.clearedLevel + 1;
        if (level > 100) throw new Error('이미 100단계까지 모두 정복했어요!');
        const monster = monsterForLevel(level);
        const currentPower = heroPower(current);
        const chance = battleChance(currentPower, monster.power);
        const won = roll < chance;
        const nextHero = {
          ...current,
          clearedLevel: won ? level : current.clearedLevel,
          lastBattle: {
            level,
            won,
            power: currentPower,
            monsterPower: monster.power,
            at: Date.now(),
          },
        };
        const update = { rpg: nextHero };
        if (won) update.cash = (s.cash || 0) + monster.reward;
        tx.update(studentRef, update);
        battleResult = { won, monster, chance, currentPower };
      });
      setMsg(battleResult.won
        ? { type: 'ok', text: `🎉 ${battleResult.monster.name}을(를) 물리쳤어요! ${fmt(battleResult.monster.reward)}${klass.currency}를 보상으로 받았어요.` }
        : { type: 'err', text: `💥 아쉽게 졌어요. 승리 확률은 약 ${Math.round(battleResult.chance * 100)}%였어요. 장비를 더 맞춰 다시 도전해 보세요.` });
    } catch (e) {
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
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl shadow-lg p-6 text-center">
          <div className="text-7xl mb-2">{hero.character ? HERO_ITEM_MAP[hero.character]?.emoji : '❔'}</div>
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
                <div key={slot} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-3 py-2">
                  <span className="text-xs text-gray-400 w-12">{label}</span>
                  <span className="text-2xl">{item?.emoji || '▫️'}</span>
                  <span className="text-sm text-gray-600">{item?.name || '미장착'}</span>
                  <span className="ml-auto text-sm text-indigo-500">{item ? `+${item.power}` : ''}</span>
                </div>
              );
            })}
          </div>
          <Link to="/student/hero/shop" className="block text-center text-sm text-indigo-500 underline mt-4">장비 바꾸러 가기 →</Link>
        </div>
      </div>

      {nextMonster ? (
        <div className="bg-white rounded-3xl shadow p-5">
          <div className="flex items-center gap-3">
            <div className="text-6xl">{nextMonster.emoji}</div>
            <div>
              <div className="text-xs text-gray-400">NEXT · {nextMonster.level}단계 {nextMonster.boss ? '보스' : '몬스터'}</div>
              <h3 className="text-xl text-gray-700">{nextMonster.name}</h3>
              <div className="text-sm text-rose-500">몬스터 전투력 {fmt(nextMonster.power)}</div>
              <div className="text-xs text-amber-600">승리 보상 {fmt(nextMonster.reward)} {klass.currency}</div>
            </div>
            <button
              onClick={battle}
              disabled={busy || !hero.character}
              className="ml-auto rounded-2xl px-5 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white shadow font-bold"
            >
              {busy ? '전투 중...' : '⚔️ 전투 시작'}
            </button>
          </div>
          {!hero.character && <p className="text-sm text-rose-500 mt-4">상점에서 캐릭터를 먼저 구매해야 전투할 수 있어요.</p>}
        </div>
      ) : (
        <div className="bg-amber-50 text-amber-700 rounded-3xl shadow p-6 text-center">🏆 100단계 정복 완료! 진정한 경제 용사예요.</div>
      )}

      {hero.lastBattle && (
        <div className="text-center text-xs text-gray-400">
          마지막 전투: {hero.lastBattle.level}단계 · {hero.lastBattle.won ? '승리' : '패배'} · {new Date(hero.lastBattle.at).toLocaleString('ko-KR')}
        </div>
      )}
    </div>
  );
}

