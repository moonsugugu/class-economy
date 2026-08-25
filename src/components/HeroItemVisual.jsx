import { HERO_RARITIES } from '../lib/hero';

const SLOT_MARKS = {
  helmet: 'HEAD', weapon: 'ATK', armor: 'DEF', gloves: 'CORE',
  shoes: 'MOVE', accessory: 'LUCK', character: 'HERO', pet: 'PET',
};

const SLOT_LABELS = {
  helmet: '머리', weapon: '무기', armor: '갑옷', gloves: '장갑',
  shoes: '신발', accessory: '장신구', character: '용사', pet: '펫',
};

const DEFAULT_TONE = { main: '#5964d8', accent: '#22d3ee', glow: '#a5f3fc', dark: '#151a4e' };

function toneOf(item) {
  return { ...DEFAULT_TONE, ...(item?.visual || {}) };
}

function ItemGlyph({ item }) {
  const tone = toneOf(item);
  const tier = Math.min(5, Math.max(1, Number(item.level) ? Math.ceil(item.level / 4) : 1));
  const className = `hero-item-glyph hero-item-glyph-${item.slot} hero-item-glyph-tier-${tier}`;
  const style = {
    '--glyph-main': tone.main,
    '--glyph-accent': tone.accent,
    '--glyph-glow': tone.glow,
    '--glyph-dark': tone.dark,
  };

  if (item.slot === 'character') {
    return <span className={`${className} hero-item-glyph-character`} style={style}><i className="glyph-cape" /><i className="glyph-body" /><i className="glyph-head" /><i className="glyph-hair" /><b>{item.visual?.mark || '✦'}</b></span>;
  }
  if (item.slot === 'helmet') {
    return <span className={className} style={style}><i className="glyph-helmet-dome" /><i className="glyph-helmet-visor" /><i className="glyph-helmet-crest" /><b>{item.visual?.mark || '◇'}</b></span>;
  }
  if (item.slot === 'weapon') {
    return <span className={className} style={style}><i className="glyph-weapon-blade" /><i className="glyph-weapon-hilt" /><i className="glyph-weapon-core" /><b>{item.visual?.mark || '✦'}</b></span>;
  }
  if (item.slot === 'armor') {
    return <span className={className} style={style}><i className="glyph-armor-plate" /><i className="glyph-armor-shoulder glyph-armor-shoulder-left" /><i className="glyph-armor-shoulder glyph-armor-shoulder-right" /><i className="glyph-armor-core" /><b>{item.visual?.mark || '◆'}</b></span>;
  }
  if (item.slot === 'gloves') {
    return <span className={className} style={style}><i className="glyph-glove glyph-glove-left" /><i className="glyph-glove glyph-glove-right" /><i className="glyph-glove-link" /><b>{item.visual?.mark || '✥'}</b></span>;
  }
  if (item.slot === 'shoes') {
    return <span className={className} style={style}><i className="glyph-shoe glyph-shoe-left" /><i className="glyph-shoe glyph-shoe-right" /><i className="glyph-shoe-wing" /><b>{item.visual?.mark || '⌁'}</b></span>;
  }
  if (item.slot === 'accessory') {
    return <span className={className} style={style}><i className="glyph-accessory-ring" /><i className="glyph-accessory-gem" /><i className="glyph-accessory-orbit" /><b>{item.visual?.mark || '◇'}</b></span>;
  }
  return <span className={`${className} hero-item-glyph-pet`} style={style}><i className="glyph-pet-ear glyph-pet-ear-left" /><i className="glyph-pet-ear glyph-pet-ear-right" /><i className="glyph-pet-body" /><i className="glyph-pet-eye glyph-pet-eye-left" /><i className="glyph-pet-eye glyph-pet-eye-right" /><b>{item.visual?.mark || '✦'}</b></span>;
}

export function HeroItemVisual({ item, size = 76, className = '', showLevel = true }) {
  if (!item) {
    return (
      <div className={`hero-item-card-v2 hero-item-empty ${className}`} style={{ width: size, height: size }}>
        <span>EMPTY</span>
      </div>
    );
  }

  const theme = item.rarity ? HERO_RARITIES[item.rarity] : null;
  const tone = toneOf(item);
  const transcendent = item.rarity === 'transcendent';
  const style = {
    width: size,
    height: size,
    '--item-main': tone.main,
    '--item-accent': tone.accent,
    '--item-glow': tone.glow,
    '--item-dark': tone.dark,
    '--item-rarity': theme?.accent || tone.accent,
  };
  return (
    <div
      className={`hero-item-card-v2 ${transcendent ? 'hero-item-card-prismatic' : ''} ${item.rarity === 'legendary' ? 'hero-item-card-legendary' : ''} ${item.rarity === 'elite' ? 'hero-item-card-elite' : ''} ${className}`}
      style={style}
      title={item.name}
      aria-label={item.name}
    >
      <div className="hero-item-card-grid" />
      <div className="hero-item-card-corner hero-item-card-corner-left" />
      <div className="hero-item-card-corner hero-item-card-corner-right" />
      <div className="hero-item-card-topline">
        <span>{SLOT_MARKS[item.slot] || 'ITEM'}</span>
        <b>{item.slot === 'character' ? '01' : String(item.level).padStart(2, '0')}</b>
      </div>
      <div className="hero-item-card-glyph"><ItemGlyph item={item} /></div>
      <div className="hero-item-card-bottomline">
        <span>{SLOT_LABELS[item.slot] || '아이템'}</span>
        {showLevel && item.rarity && <b>{item.rarityLabel}</b>}
      </div>
      {item.slot === 'pet' && <span className="hero-item-card-pet-rate">{item.critChance}%</span>}
    </div>
  );
}

export function HeroRarityBadge({ item }) {
  if (!item?.rarity) return null;
  const rarity = HERO_RARITIES[item.rarity];
  return <span className={`hero-rarity-badge-v2 hero-rarity-${item.rarity}`}>{rarity.label}</span>;
}
