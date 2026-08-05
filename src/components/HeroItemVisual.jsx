import { HERO_RARITIES } from '../lib/hero';

const SLOT_MARKS = {
  helmet: '머리',
  weapon: '손',
  armor: '몸',
  shoes: '발',
  accessory: '장신구',
  character: '용사',
};

const CHARACTER_THEME = {
  surface: 'from-indigo-50 via-white to-pink-100',
  border: 'border-indigo-300',
  accent: '#818cf8',
};

export function HeroItemVisual({ item, size = 76, className = '', showLevel = true }) {
  if (!item) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-2xl text-slate-300 ${className}`}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  const theme = item.rarity ? HERO_RARITIES[item.rarity] : CHARACTER_THEME;
  const accent = theme.accent || '#818cf8';
  return (
    <div
      className={`relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-gradient-to-br ${theme.surface} ${theme.border} shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: `0 14px 28px -16px ${accent}, inset 0 1px 0 rgba(255,255,255,.9)`,
      }}
      title={item.name}
      aria-label={item.name}
    >
      <div
        className="absolute -right-4 -top-5 h-14 w-14 rounded-full opacity-30 blur-xl"
        style={{ background: accent }}
      />
      <div
        className="absolute bottom-1 left-1/2 h-2 w-2/3 -translate-x-1/2 rounded-full opacity-25 blur-md"
        style={{ background: accent }}
      />
      <span
        className="relative z-10 drop-shadow-[0_4px_4px_rgba(15,23,42,.22)]"
        style={{ fontSize: Math.max(26, size * 0.48), lineHeight: 1 }}
      >
        {item.emoji || '✨'}
      </span>
      <span
        className="absolute bottom-1 left-1 rounded-md bg-white/75 px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-slate-600 backdrop-blur"
      >
        {item.slot === 'character' ? 'HERO' : `T${item.level}`}
      </span>
      <span
        className="absolute right-1 top-1 rounded-md px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm"
        style={{ background: accent }}
      >
        {SLOT_MARKS[item.slot] || '아이템'}
      </span>
      {showLevel && item.rarity && (
        <span className="absolute bottom-1 right-1 text-[8px] font-bold text-slate-500/70">{item.rarityLabel}</span>
      )}
    </div>
  );
}

export function HeroRarityBadge({ item }) {
  if (!item?.rarity) return null;
  const rarity = HERO_RARITIES[item.rarity];
  return (
    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${rarity.color}`}>
      {item.rarityLabel}
    </span>
  );
}
