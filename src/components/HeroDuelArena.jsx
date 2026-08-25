import HeroCardVisual from './HeroCardVisual.jsx';
import { fmt } from '../lib/util';

const phaseText = {
  idle: '대결 준비 완료',
  charge: '두 용사의 힘이 모이고 있어요!',
  attack: '⚔️ 공격 발동!',
  win: '🏆 대결 승리!',
  lose: '💥 대결 패배',
};

export default function HeroDuelArena({
  hero,
  opponent,
  heroName,
  opponentName,
  power = 0,
  opponentPower = 0,
  chance = 0,
  phase = 'idle',
  result = null,
}) {
  const heroAction = phase === 'attack' ? 'attack' : phase === 'charge' ? 'charge' : phase;
  const opponentAction = phase === 'attack'
    ? 'hit'
    : phase === 'win'
      ? 'lose'
      : phase === 'lose'
        ? 'win'
        : heroAction;
  const showActionFx = phase === 'attack' || phase === 'win' || phase === 'lose';

  return (
    <section className="battle-arena hero-battle-card rounded-[2rem] border border-indigo-300/30 p-4 shadow-xl sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[0.25em] text-pink-300">DUEL ARENA</div>
          <h3 className="text-lg font-bold text-white">{phaseText[phase] || phaseText.idle}</h3>
        </div>
        <div className="rounded-2xl border border-white/15 bg-slate-950/35 px-3 py-2 text-right text-xs text-indigo-100 backdrop-blur">
          <div>내 승리 확률</div>
          <b className="text-lg text-rose-200">{Math.round(chance * 100)}%</b>
        </div>
      </div>

      <div className="relative grid min-h-[270px] grid-cols-[1fr_auto_1fr] items-end gap-2 sm:gap-6">
        <div className={`relative flex flex-col items-center justify-end transition ${phase === 'win' ? 'battle-hero-win' : phase === 'lose' ? 'battle-hero-lose' : ''}`}>
          <div className="mb-1 rounded-full bg-indigo-400/20 px-3 py-1 text-[10px] font-bold text-cyan-200">MY HERO</div>
          <HeroCardVisual hero={hero} size={172} animated action={heroAction} />
          <div className="mt-[-6px] max-w-full truncate rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
            {heroName} · {fmt(power)}
          </div>
        </div>

        <div className="relative flex h-full items-center justify-center pb-8">
          <div className={`rounded-full border-4 border-white/80 bg-gradient-to-br from-rose-500 to-orange-400 px-3 py-2 text-sm font-black text-white shadow-lg ${phase === 'attack' ? 'scale-125 rotate-6' : ''} transition`}>
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

        <div className={`relative flex flex-col items-center justify-end transition ${phase === 'win' ? 'battle-hero-lose' : phase === 'lose' ? 'battle-hero-win' : ''}`}>
          <div className="mb-1 rounded-full bg-rose-400/20 px-3 py-1 text-[10px] font-bold text-pink-200">RIVAL HERO</div>
          <HeroCardVisual hero={opponent} size={172} animated action={opponentAction} />
          <div className="mt-[-6px] max-w-full truncate rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
            {opponentName} · {fmt(opponentPower)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-indigo-100">
        <span className={`h-2 w-2 rounded-full ${phase === 'win' ? 'bg-emerald-400' : phase === 'lose' ? 'bg-rose-400' : phase === 'idle' ? 'bg-slate-300' : 'bg-amber-400 animate-pulse'}`} />
        <span>{phaseText[phase] || phaseText.idle}</span>
        {result && <span className="rounded-full bg-white/75 px-2 py-1 font-bold text-slate-600">{result.won ? `+${fmt(result.reward)} 보상` : '보상 0'}</span>}
      </div>
    </section>
  );
}
