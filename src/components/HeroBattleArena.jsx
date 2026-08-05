import HeroPreview from '../three/Hero3D.jsx';
import { fmt } from '../lib/util';
import MonsterVisual from './MonsterVisual.jsx';

const phaseText = {
  idle: '전투 준비 완료',
  charge: '용사의 힘이 모이고 있어요!',
  attack: '⚔️ 공격 발동!',
  win: '🏆 승리! 다음 단계로 전진!',
  lose: '💥 아쉬워요! 다시 장비를 점검해 보세요.',
};

export default function HeroBattleArena({ hero, power = 0, monster, phase = 'idle', chance = 0, bossDamage = 0, battleFx = null }) {
  const heroAction = phase === 'attack' ? 'attack' : phase === 'charge' ? 'charge' : phase;
  const monsterMotion = phase === 'attack' ? 'battle-monster-attack' : phase === 'win' || phase === 'lose' ? 'battle-monster-hit' : '';
  const showActionFx = phase === 'attack' || phase === 'win' || phase === 'lose';
  return (
    <section className="battle-arena rounded-[2rem] border border-white/80 p-4 shadow-xl sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[0.25em] text-indigo-400">BATTLE ARENA</div>
          <h3 className="text-lg font-bold text-slate-700">{phaseText[phase] || phaseText.idle}</h3>
        </div>
        <div className="rounded-2xl bg-white/70 px-3 py-2 text-right text-xs text-slate-500 backdrop-blur">
          <div>승리 확률</div>
          <b className="text-lg text-indigo-600">{Math.round(chance * 100)}%</b>
        </div>
      </div>

      <div className="relative grid min-h-[270px] grid-cols-[1fr_auto_1fr] items-end gap-2 sm:gap-6">
        <div className={`relative flex flex-col items-center justify-end transition ${phase === 'win' ? 'battle-hero-win' : phase === 'lose' ? 'battle-hero-lose' : ''}`}>
          <div className="mb-1 rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-bold text-indigo-600">MY HERO</div>
          <HeroPreview hero={hero} size={172} animated action={heroAction} />
          <div className="mt-[-6px] rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white shadow-lg">용사 전투력 {fmt(power)}</div>
        </div>

        <div className="relative flex h-full items-center justify-center pb-8">
          <div className={`rounded-full border-4 border-white/80 bg-gradient-to-br from-indigo-500 to-fuchsia-500 px-3 py-2 text-sm font-black text-white shadow-lg ${phase === 'attack' ? 'scale-125 rotate-6' : ''} transition`}>
            VS
          </div>
          {phase === 'charge' && <div key={phase} className="battle-charge-ring" />}
          {showActionFx && <div key={`${phase}-slash`} className="battle-slash" />}
          {showActionFx && [
            ['-48px', '-34px'], ['36px', '-42px'], ['-58px', '38px'], ['48px', '34px'],
          ].map(([x, y], index) => (
            <span
              key={`${phase}-spark-${index}`}
              className="battle-spark"
              style={{ '--spark-x': x, '--spark-y': y, animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>

        <div className="relative flex flex-col items-center justify-end">
          <div className="mb-1 rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-bold text-rose-600">NEXT MONSTER</div>
          <div className={['flex h-[172px] w-[172px] items-center justify-center rounded-[2rem] border-2 border-white/80 bg-gradient-to-b from-rose-50 to-orange-100 shadow-inner', monsterMotion].join(' ')}>
            <div className="battle-monster drop-shadow-[0_10px_6px_rgba(124,45,18,.22)]">
              <MonsterVisual monster={monster} size={132} />
            </div>
          </div>
          <div className="mt-[-6px] rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white shadow-lg">{monster.name} · 전투력 {fmt(monster.power)}</div>
          {monster.boss && (
            <div className="mt-2 w-full max-w-[172px]">
              <div className="mb-1 flex justify-between text-[10px] font-bold text-fuchsia-700">
                <span>보스 HP</span>
                <span>{fmt(Math.max(0, monster.maxHp - bossDamage))} / {fmt(monster.maxHp)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-fuchsia-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 transition-all"
                  style={{ width: Math.max(0, Math.min(100, ((monster.maxHp - bossDamage) / monster.maxHp) * 100)) + '%' }}
                />
              </div>
              {battleFx?.critical && <div className="mt-1 text-center text-[10px] font-black text-amber-600 animate-pulse">CRITICAL ×2</div>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
        <span className={`h-2 w-2 rounded-full ${phase === 'win' ? 'bg-emerald-400' : phase === 'lose' ? 'bg-rose-400' : phase === 'idle' ? 'bg-slate-300' : 'bg-amber-400 animate-pulse'}`} />
        {phaseText[phase] || phaseText.idle}
      </div>
    </section>
  );
}
