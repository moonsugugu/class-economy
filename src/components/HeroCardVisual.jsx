import { HERO_GRADE_VISUALS, HERO_ITEM_MAP, HERO_RARITIES, normalizeHero } from '../lib/hero';
import arenaBackground from '../assets/hero-card-arena.png';
import { HeroPetVisual } from './HeroItemVisual.jsx';
import HeroCharacterArt from './HeroCharacterArt.jsx';

const FALLBACK_TONE = {
  main: '#5964d8',
  accent: '#22d3ee',
  glow: '#a5f3fc',
  dark: '#151a4e',
};

const toneOf = (item, fallback = FALLBACK_TONE) => ({
  ...fallback,
  ...(item?.visual || {}),
});

export default function HeroCardVisual({ hero: rawHero, size = 180, animated = false, action = 'idle', className = '' }) {
  const hero = normalizeHero(rawHero);
  const character = HERO_ITEM_MAP[hero.character];
  const helmet = HERO_ITEM_MAP[hero.equipment.helmet];
  const weapon = HERO_ITEM_MAP[hero.equipment.weapon];
  const armor = HERO_ITEM_MAP[hero.equipment.armor];
  const gloves = HERO_ITEM_MAP[hero.equipment.gloves];
  const shoes = HERO_ITEM_MAP[hero.equipment.shoes];
  const accessory = HERO_ITEM_MAP[hero.equipment.accessory];
  const pet = HERO_ITEM_MAP[hero.pet];
  const equipmentItems = [
    ['helmet', helmet],
    ['weapon', weapon],
    ['armor', armor],
    ['gloves', gloves],
    ['shoes', shoes],
    ['accessory', accessory],
  ];
  const equippedCount = equipmentItems.filter(([, item]) => item).length;
  const strongestEquipment = equipmentItems.reduce((strongest, [, item]) => {
    if (!item) return strongest;
    const candidateGrade = HERO_GRADE_VISUALS[item.rarity] || HERO_GRADE_VISUALS.common;
    if (!strongest || candidateGrade.rank > strongest.grade.rank) return { item, grade: candidateGrade };
    return strongest;
  }, null);
  const equippedGradeKeys = equipmentItems
    .map(([, item]) => item?.rarity)
    .filter((rarity) => rarity && HERO_GRADE_VISUALS[rarity]);
  const secondaryGradeKey = [...new Set(equippedGradeKeys)]
    .sort((left, right) => HERO_GRADE_VISUALS[right].rank - HERO_GRADE_VISUALS[left].rank)
    .find((rarity) => rarity !== strongestEquipment?.item?.rarity) || 'common';
  const gradeKey = strongestEquipment?.item?.rarity && HERO_GRADE_VISUALS[strongestEquipment.item.rarity]
    ? strongestEquipment.item.rarity
    : 'common';
  const grade = HERO_GRADE_VISUALS[gradeKey];
  const female = hero.character === 'hero_female';
  const characterTone = toneOf(character, female
    ? { main: '#7c3aed', accent: '#22d3ee', glow: '#f9a8d4', dark: '#26124f', hair: '#26124f' }
    : { main: '#4f46e5', accent: '#fb7185', glow: '#fbbf24', dark: '#171b55', hair: '#171b55' });
  const armorTone = toneOf(armor, characterTone);
  const helmetTone = toneOf(helmet, armorTone);
  const weaponTone = toneOf(weapon, { main: '#e5e7eb', accent: '#fbbf24', glow: '#fff7ed', dark: '#334155' });
  const gloveTone = toneOf(gloves, armorTone);
  const shoeTone = toneOf(shoes, { main: '#28335f', accent: '#22d3ee', glow: '#a5f3fc', dark: '#111936' });
  const accessoryTone = toneOf(accessory, { main: '#f59e0b', accent: '#fb7185', glow: '#fef3c7', dark: '#7c2d12' });
  const petTone = toneOf(pet, { main: '#a855f7', accent: '#22d3ee', glow: '#f0abfc', dark: '#3b0764' });
  const rarity = character?.rarity ? HERO_RARITIES[character.rarity] : null;
  const style = {
    width: size,
    height: size,
    backgroundImage: `url(${arenaBackground})`,
    '--hero-main': characterTone.main,
    '--hero-accent': characterTone.accent,
    '--hero-glow': characterTone.glow,
    '--hero-dark': characterTone.dark,
    '--hero-hair': characterTone.hair || (female ? '#26124f' : '#171b55'),
    '--hero-skin': female ? '#f4c7b3' : '#edb38e',
    '--hero-armor': armorTone.main,
    '--hero-armor-accent': armorTone.accent,
    '--hero-armor-glow': armorTone.glow,
    '--hero-armor-dark': armorTone.dark,
    '--hero-helmet': helmetTone.main,
    '--hero-helmet-accent': helmetTone.accent,
    '--hero-helmet-glow': helmetTone.glow,
    '--hero-weapon': weaponTone.main,
    '--hero-weapon-accent': weaponTone.accent,
    '--hero-weapon-glow': weaponTone.glow,
    '--hero-glove': gloveTone.main,
    '--hero-glove-accent': gloveTone.accent,
    '--hero-shoe': shoeTone.main,
    '--hero-shoe-accent': shoeTone.accent,
    '--hero-accessory': accessoryTone.main,
    '--hero-accessory-glow': accessoryTone.glow,
    '--hero-pet': petTone.main,
    '--hero-pet-accent': petTone.accent,
    '--hero-pet-glow': petTone.glow,
    '--hero-grade-main': grade.main,
    '--hero-grade-accent': grade.accent,
    '--hero-grade-glow': grade.glow,
    '--hero-grade-dark': grade.dark,
    '--hero-grade-secondary': HERO_GRADE_VISUALS[secondaryGradeKey].accent,
  };

  return (
    <div
      className={[
        'hero-card-visual',
        animated ? 'hero-card-animated' : '',
        `hero-card-action-${action}`,
        rarity?.label ? `hero-card-rarity-${character.rarity}` : '',
        `hero-card-grade-${gradeKey}`,
        `hero-card-grade-shape-${grade.shape}`,
        new Set(equippedGradeKeys).size > 1 ? 'hero-card-loadout-mixed' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      aria-label={character?.name || '용사 카드'}
    >
      <div className="hero-card-grid" />
      <div className="hero-card-sparks" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <i key={index} style={{ '--spark-index': index }} />)}
      </div>
      <div className="hero-card-header">
        <span>HERO CORE <em className="hero-card-grade-mini">{grade.label}</em></span>
        <b>{String(hero.clearedLevel).padStart(2, '0')}</b>
      </div>
      <div className="hero-card-sigil" aria-hidden="true">✦</div>
      <div className="hero-card-ground" />

      {character?.visual?.art ? (
        <div className={`hero-card-art-wrap hero-card-gear-count-${equippedCount}`}>
          <div className="hero-card-art-backdrop" aria-hidden="true" />
          <div className="hero-card-evolution-aura" aria-hidden="true">
            <span className="hero-card-evolution-ring hero-card-evolution-ring-outer" />
            <span className="hero-card-evolution-ring hero-card-evolution-ring-inner" />
            <span className="hero-card-evolution-core">{grade.symbol}</span>
          </div>
          <div className="hero-card-evolution-silhouette" aria-hidden="true">
            <span className="hero-card-evolution-shoulder hero-card-evolution-shoulder-left" />
            <span className="hero-card-evolution-shoulder hero-card-evolution-shoulder-right" />
            <span className="hero-card-evolution-wing hero-card-evolution-wing-left" />
            <span className="hero-card-evolution-wing hero-card-evolution-wing-right" />
            <span className="hero-card-evolution-crown" />
            <span className="hero-card-evolution-star hero-card-evolution-star-left">✦</span>
            <span className="hero-card-evolution-star hero-card-evolution-star-right">✦</span>
          </div>
          <HeroCharacterArt className="hero-card-art" src={character.visual.art} alt={character.name || '용사'} />
        </div>
      ) : (
      <div className="hero-card-figure">
        <div className="hero-card-cape" />
        <div className="hero-card-legs">
          <div className="hero-card-leg hero-card-leg-left"><span className="hero-card-shoe" /></div>
          <div className="hero-card-leg hero-card-leg-right"><span className="hero-card-shoe" /></div>
        </div>
        <div className="hero-card-torso">
          <div className="hero-card-armor-panel"><span>◆</span></div>
          <div className="hero-card-belt" />
        </div>
        <div className="hero-card-arm hero-card-arm-left"><span className="hero-card-glove" /></div>
        <div className="hero-card-arm hero-card-arm-right"><span className="hero-card-glove" /></div>
        <div className="hero-card-shield"><span>{armor?.visual?.mark || '◆'}</span></div>
        <div className="hero-card-sword"><span className="hero-card-blade" /><span className="hero-card-hilt" /></div>
        <div className="hero-card-head">
          <div className="hero-card-face"><i className="hero-card-eye hero-card-eye-left" /><i className="hero-card-eye hero-card-eye-right" /><span className="hero-card-mouth" /></div>
          <div className="hero-card-hair" />
          <div className="hero-card-helmet"><span>{helmet?.visual?.mark || '◇'}</span></div>
        </div>
        <div className="hero-card-necklace"><span>{accessory?.visual?.mark || '✦'}</span></div>
      </div>
      )}

      {pet && (
        <HeroPetVisual
          item={pet}
          size={pet.visual?.art ? 78 : 58}
          className={pet.visual?.art ? 'hero-card-pet hero-card-pet-image' : 'hero-card-pet'}
        />
      )}
      <div className="hero-card-footer">
        <span>{character?.name || '용사 대기 중'}</span>
        <b><i>{grade.label}</i> · {hero.clearedLevel >= 100 ? 'FINAL' : `STAGE ${hero.clearedLevel + 1}`}</b>
      </div>
    </div>
  );
}
