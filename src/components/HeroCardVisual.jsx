import { HERO_GRADE_VISUALS, HERO_ITEM_MAP, HERO_RARITIES, normalizeHero } from '../lib/hero';
import arenaBackground from '../assets/hero-card-arena.png';
import { HeroEquipmentOverlay, HeroPetVisual } from './HeroItemVisual.jsx';
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
  const itemForSlot = (slot) => {
    const item = HERO_ITEM_MAP[hero.equipment[slot]];
    return item?.slot === slot ? item : null;
  };
  const helmet = itemForSlot('helmet');
  const weapon = itemForSlot('weapon');
  const armor = itemForSlot('armor');
  const gloves = itemForSlot('gloves');
  const shoes = itemForSlot('shoes');
  const accessory = itemForSlot('accessory');
  const pet = HERO_ITEM_MAP[hero.pet];
  const equipmentItems = [
    ['helmet', helmet],
    ['weapon', weapon],
    ['armor', armor],
    ['gloves', gloves],
    ['shoes', shoes],
    ['accessory', accessory],
  ];
  const equippedGradeKeys = equipmentItems
    .map(([, item]) => item?.rarity)
    .filter((rarity) => rarity && HERO_GRADE_VISUALS[rarity]);
  const mixedGrade = new Set(equippedGradeKeys).size > 1;
  const frameGradeKey = !mixedGrade && armor?.rarity && HERO_GRADE_VISUALS[armor.rarity]
    ? armor.rarity
    : 'common';
  const gradeKey = frameGradeKey;
  const grade = HERO_GRADE_VISUALS[gradeKey];
  const loadoutLabel = mixedGrade || (equippedGradeKeys.length > 0 && !armor)
    ? 'LOADOUT'
    : grade.label;
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
  // 완성된 혼합 일러스트는 장착 상태와 상관없이 모든 장비가 들어 있어요.
  // 따라서 항상 기본 캐릭터를 깔고, 아래에서 현재 장착된 슬롯만 합성합니다.
  const characterArt = character?.visual?.baseArt || character?.visual?.art;
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
  };

  return (
    <div
      className={[
        'hero-card-visual',
        animated ? 'hero-card-animated' : '',
        `hero-card-action-${action}`,
        rarity?.label ? `hero-card-rarity-${character.rarity}` : '',
        `hero-card-grade-${gradeKey}`,
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
        <span>HERO CORE <em className="hero-card-grade-mini">{loadoutLabel}</em></span>
        <b>{String(hero.clearedLevel).padStart(2, '0')}</b>
      </div>
      <div className="hero-card-sigil" aria-hidden="true">✦</div>
      <div className="hero-card-ground" />

      {characterArt ? (
        <div className="hero-card-art-wrap">
          <div className="hero-card-art-backdrop" aria-hidden="true" />
          <HeroCharacterArt className="hero-card-art" src={characterArt} alt={character.name || '용사'} />
          <div className="hero-card-gear-layer" aria-label="현재 장착 장비 외형">
            {equipmentItems.map(([slot, item]) => item && (
              <HeroEquipmentOverlay
                key={item.id}
                item={item}
                className={`hero-card-equip hero-card-equip-${slot} hero-card-equip-grade-${item.rarity || 'common'}`}
              />
            ))}
          </div>
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
        <b><i>{loadoutLabel}</i> · {hero.clearedLevel >= 100 ? 'FINAL' : `STAGE ${hero.clearedLevel + 1}`}</b>
      </div>
    </div>
  );
}
