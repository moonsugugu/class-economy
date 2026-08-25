import maleHeroArt from '../assets/hero-guardian-male.png';
import femaleHeroArt from '../assets/hero-guardian-female.png';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const HERO_SLOTS = [
  ['helmet', '헬멧'],
  ['weapon', '무기'],
  ['armor', '갑옷'],
  ['gloves', '장갑'],
  ['shoes', '신발'],
  ['accessory', '장신구'],
];

export const HERO_PET_SLOT = ['pet', '펫'];

export const HERO_RARITIES = {
  common: {
    label: '일반', color: 'bg-slate-100 text-slate-600', weight: 8,
    accent: '#94a3b8', surface: 'from-slate-50 via-white to-slate-100', border: 'border-slate-200', glow: 'shadow-slate-200',
  },
  rare: {
    label: '희귀', color: 'bg-sky-100 text-sky-700', weight: 4,
    accent: '#38bdf8', surface: 'from-sky-50 via-white to-cyan-100', border: 'border-sky-300', glow: 'shadow-sky-200',
  },
  elite: {
    label: '엘리트', color: 'bg-violet-100 text-violet-700', weight: 2,
    accent: '#a78bfa', surface: 'from-violet-50 via-white to-fuchsia-100', border: 'border-violet-300', glow: 'shadow-violet-200',
  },
  legendary: {
    label: '전설', color: 'bg-amber-100 text-amber-700', weight: 1,
    accent: '#f59e0b', surface: 'from-amber-50 via-yellow-50 to-orange-100', border: 'border-amber-400', glow: 'shadow-amber-200',
  },
  transcendent: {
    label: '초월', color: 'bg-fuchsia-100 text-fuchsia-700', weight: 0.25,
    accent: '#ec4899', surface: 'from-pink-50 via-white to-cyan-100', border: 'border-fuchsia-400', glow: 'shadow-fuchsia-300',
  },
};

export const HERO_SHOP_REFRESH_LIMIT = 3;

const HERO_CHARACTERS = [
  {
    id: 'hero_male', slot: 'character', name: '네온 수호자', emoji: '🛡️', price: 100, power: 12,
    visual: { main: '#4f46e5', accent: '#fb7185', glow: '#fbbf24', hair: '#171b55', role: 'guardian', art: maleHeroArt },
  },
  {
    id: 'hero_female', slot: 'character', name: '루미나 가디언', emoji: '⚔️', price: 100, power: 14,
    visual: { main: '#7c3aed', accent: '#22d3ee', glow: '#f9a8d4', hair: '#26124f', role: 'arcane', art: femaleHeroArt },
  },
];

const GEAR_NAMES = {
  helmet: ['루키 헤드밴드', '코발트 바이저', '홍련 바이저', '황동 크레스트', '나이트 헬름', '심연의 투구', '문장 투구', '별무늬 투구', '룬 아치 헬름', '수정 크라운', '기사단 크라운', '성운 바이저', '왕국의 관', '성휘 헬름', '고대 룬헬름', '용맥 투구', '홍염 크라운', '폭풍왕 헬름', '별자리 크라운', '천공의 왕관'],
  weapon: ['수련용 블레이드', '룬 단검', '황동 세이버', '코발트 소드', '나이트 브레이커', '심연의 펄스', '문장 엣지', '별무늬 커터', '룬폴 스피어', '수정 엑스', '기사단 브레이커', '성운 블레이드', '왕국의 검', '성휘 그레이트소드', '고대 룬엣지', '용맥 클리버', '홍염 버스터', '폭풍왕 랜스', '별자리 보우', '천공의 아크'],
  armor: ['루키 전투복', '코발트 베스트', '홍련 메일', '황동 플레이트', '나이트 아머', '심연의 셸', '문장 하네스', '별무늬 코트', '룬 아머', '수정 플레이트', '기사단 아머', '성운 메일', '왕국의 갑주', '성휘 아머', '고대 룬아머', '용맥 플레이트', '홍염 브레이서', '폭풍왕 아머', '별자리 코트', '천공의 갑주'],
  gloves: ['루키 핸드랩', '코발트 글러브', '홍련 너클', '황동 건틀릿', '나이트 그립', '심연의 피스트', '문장 건틀릿', '별무늬 너클', '룬 브레이서', '수정 건틀릿', '기사단 피스트', '성운 글러브', '왕국의 건틀릿', '성휘 너클', '고대 룬핸드', '용맥 건틀릿', '홍염 피스트', '폭풍왕 그립', '별자리 브레이서', '천공의 건틀릿'],
  shoes: ['루키 스텝', '코발트 부츠', '홍련 러너', '황동 그리브', '나이트 워커', '심연의 스텝', '문장 부츠', '별무늬 러너', '룬 워커', '수정 그리브', '기사단 부츠', '성운 스텝', '왕국의 그리브', '성휘 러너', '고대 룬부츠', '용맥 클리버', '홍염 워커', '폭풍왕 스텝', '별자리 부츠', '천공의 그리브'],
  accessory: ['첫 번째 엠블럼', '코발트 칩', '홍련 코어', '황동 링', '나이트 시길', '심연의 펜던트', '문장 메달', '별무늬 브로치', '룬 크리스털', '수정 하트', '기사단 엠블럼', '성운 펜던트', '왕국의 인장', '성휘 메달', '고대 룬코어', '용맥 보석', '홍염 코어링', '폭풍왕 시길', '별자리 펜던트', '천공의 크라운젬'],
};

const GEAR_EMOJIS = {
  helmet: ['⬡', '◇', '✦', '⬢', '♜', '◈', '✥', '✧', '⌬', '✹', '♛', '✺', '♜', '✦', '⌘', '♢', '✹', '✧', '✦', '✺'],
  weapon: ['╱', '◈', '✦', '⚔', '✦', '◒', '✧', '✹', '⚡', '✥', '⚔', '✺', '⚔', '✦', '⌘', '◈', '✹', '⚡', '➶', '✦'],
  armor: ['▣', '◇', '✦', '⬢', '⛓', '▣', '✥', '✧', '⌬', '✹', '♜', '✺', '♜', '✦', '⌘', '◇', '✹', '✧', '✦', '✺'],
  gloves: ['≋', '◇', '✦', '✥', '✧', '◈', '⚙', '✺', '⌬', '✹', '✦', '✧', '♜', '✦', '⌘', '◇', '✹', '⚡', '✦', '✺'],
  shoes: ['⌁', '◇', '✦', '⬢', '✧', '◈', '✥', '✺', '⌁', '✹', '✦', '✧', '♜', '✦', '⌘', '◇', '✹', '⚡', '✦', '✺'],
  accessory: ['◇', '◆', '✦', '◉', '✧', '◈', '✥', '✺', '⌬', '✹', '♜', '✦', '♜', '✧', '⌘', '◆', '✹', '⚡', '✦', '✺'],
};

const PET_MARKS = ['●', '◆', '◉', '✿', '✦', '☾', '❧', 'ϟ', '◇', '❄', '✧', '◈', '☽', '☀', '⚡', '◒', '◌', '✦', '♜', '✹'];

// 같은 슬롯이어도 단계가 올라갈수록 외형의 뼈대가 바뀌도록 디자인 패밀리를 분리합니다.
// 기존 item ID·가격·능력치는 건드리지 않고, 표시용 메타데이터만 추가해요.
const GEAR_DESIGNS = {
  helmet: ['headband', 'visor', 'horn', 'hood', 'crown', 'halo', 'mask', 'crest', 'circlet', 'antler', 'sail', 'rune', 'royal', 'halo-crest', 'ancient', 'dragon', 'flame', 'storm', 'constellation', 'sky-crown'],
  weapon: ['blade', 'dagger', 'saber', 'sword', 'breaker', 'pulse', 'edge', 'cutter', 'spear', 'axe', 'greatsword', 'rune-blade', 'king-sword', 'greatblade', 'ancient-edge', 'cleaver', 'buster', 'lance', 'bow', 'arc'],
  armor: ['vest', 'mail', 'scale', 'plate', 'knight', 'shell', 'harness', 'coat', 'rune-armor', 'crystal-plate', 'sentinel', 'nebula-mail', 'royal-armor', 'star-armor', 'ancient-armor', 'dragon-plate', 'flame-armor', 'storm-armor', 'constellation-coat', 'sky-armor'],
  gloves: ['wrap', 'glove', 'knuckle', 'gauntlet', 'grip', 'fist', 'sigil-gauntlet', 'chain-knuckle', 'rune-bracer', 'crystal-gauntlet', 'power-fist', 'nebula-glove', 'royal-gauntlet', 'star-knuckle', 'ancient-hand', 'dragon-gauntlet', 'flame-fist', 'storm-grip', 'constellation-bracer', 'sky-gauntlet'],
  shoes: ['sandal', 'boot', 'runner', 'greave', 'walker', 'step', 'crest-boot', 'star-strider', 'rune-walker', 'crystal-greave', 'knight-boot', 'nebula-step', 'royal-greave', 'sun-runner', 'ancient-boot', 'dragon-claw', 'flame-walker', 'storm-step', 'constellation-boot', 'sky-greave'],
  accessory: ['charm', 'chip', 'core', 'ring', 'sigil', 'pendant', 'medal', 'brooch', 'crystal', 'heart', 'emblem', 'nebula', 'seal', 'sun-medal', 'rune-core', 'dragon-gem', 'flame-ring', 'storm-sigil', 'constellation', 'crown-gem'],
};

const PET_DESIGNS = [
  'slime', 'fox', 'seal', 'panda', 'cat', 'wolf', 'deer', 'hawk', 'turtle', 'penguin',
  'monkey', 'dragon', 'owl', 'lion', 'eagle', 'viper', 'whale', 'unicorn', 'griffin', 'phoenix',
];

const HERO_ITEM_PALETTES = [
  { main: '#5964d8', accent: '#22d3ee', glow: '#a5f3fc', dark: '#151a4e' },
  { main: '#e05288', accent: '#fbbf24', glow: '#fde68a', dark: '#541b52' },
  { main: '#7c3aed', accent: '#fb7185', glow: '#fbcfe8', dark: '#2e1065' },
  { main: '#0f9f9a', accent: '#f59e0b', glow: '#fde68a', dark: '#123c4a' },
  { main: '#c47b22', accent: '#fef3c7', glow: '#fff7ed', dark: '#4a2412' },
  { main: '#334c9b', accent: '#f472b6', glow: '#fce7f3', dark: '#172554' },
];

function visualForItem(slot, level, rarity, index = 0) {
  const palette = HERO_ITEM_PALETTES[(level + index * 2) % HERO_ITEM_PALETTES.length];
  return {
    ...palette,
    tier: Math.max(1, Math.ceil(level / 4)),
    shape: slot,
    finish: rarity === 'transcendent' ? 'prismatic' : rarity === 'legendary' ? 'gold' : 'ink',
    mark: slot === 'pet' ? PET_MARKS[index] : GEAR_EMOJIS[slot]?.[index] || '✦',
    design: slot === 'pet' ? PET_DESIGNS[index] : GEAR_DESIGNS[slot]?.[index] || slot,
    variant: index % 5,
    designIndex: index,
  };
}

// 기존에 구매한 장비 ID와 능력치는 유지하고, 그 사이에 새 단계를 채워요.
const LEGACY_GEAR = {
  helmet: {
    1: { id: 'hero_helmet_cloth', name: '천 모자', emoji: '🧢', price: 50, power: 3 },
    6: { id: 'hero_helmet_iron', name: '철제 헬멧', emoji: '⛑️', price: 140, power: 12 },
    11: { id: 'hero_helmet_knight', name: '기사 헬멧', emoji: '🪖', price: 320, power: 30 },
    16: { id: 'hero_helmet_dragon', name: '용의 투구', emoji: '🐲', price: 800, power: 65 },
  },
  weapon: {
    1: { id: 'hero_weapon_stick', name: '나무 막대기', emoji: '🪵', price: 60, power: 5 },
    6: { id: 'hero_weapon_iron', name: '철검', emoji: '⚔️', price: 180, power: 18 },
    11: { id: 'hero_weapon_flame', name: '불꽃 검', emoji: '🔥', price: 450, power: 48 },
    16: { id: 'hero_weapon_dragon', name: '용의 검', emoji: '🗡️', price: 1100, power: 105 },
  },
  armor: {
    1: { id: 'hero_armor_cloth', name: '천 갑옷', emoji: '🥋', price: 70, power: 4 },
    6: { id: 'hero_armor_chain', name: '사슬 갑옷', emoji: '⛓️', price: 220, power: 22 },
    11: { id: 'hero_armor_knight', name: '기사 갑옷', emoji: '🛡️', price: 560, power: 58 },
    16: { id: 'hero_armor_dragon', name: '용의 갑옷', emoji: '🐉', price: 1300, power: 145 },
  },
  shoes: {
    1: { id: 'hero_shoes_sandal', name: '가죽 샌들', emoji: '👡', price: 50, power: 3 },
    6: { id: 'hero_shoes_boots', name: '전투화', emoji: '🥾', price: 160, power: 15 },
    11: { id: 'hero_shoes_wing', name: '날개 신발', emoji: '🪽', price: 420, power: 40 },
    16: { id: 'hero_shoes_dragon', name: '용의 발톱', emoji: '🐾', price: 900, power: 85 },
  },
  accessory: {
    1: { id: 'hero_accessory_lucky', name: '행운의 부적', emoji: '🍀', price: 100, power: 6 },
    6: { id: 'hero_accessory_ruby', name: '불꽃 루비', emoji: '♦️', price: 350, power: 28 },
    16: { id: 'hero_accessory_crown', name: '왕의 보석', emoji: '👑', price: 850, power: 75 },
  },
};

const POWER_BY_SLOT = {
  helmet: [3, 5, 7, 9, 11, 12, 16, 20, 24, 27, 30, 37, 44, 51, 58, 65, 78, 91, 105, 120],
  weapon: [5, 8, 11, 14, 17, 18, 26, 34, 41, 45, 48, 61, 74, 86, 96, 105, 125, 145, 168, 195],
  armor: [4, 7, 10, 13, 17, 22, 30, 38, 45, 52, 58, 70, 84, 98, 112, 145, 170, 195, 220, 250],
  gloves: [3, 6, 9, 12, 16, 20, 27, 34, 42, 50, 58, 70, 82, 94, 108, 124, 142, 162, 184, 210],
  shoes: [3, 5, 7, 10, 12, 15, 22, 28, 33, 37, 40, 50, 60, 70, 78, 85, 102, 120, 140, 165],
  accessory: [6, 9, 12, 16, 21, 28, 34, 40, 46, 52, 58, 64, 69, 72, 75, 84, 98, 114, 130, 150],
};

const rarityOfLevel = (level) => (level <= 5 ? 'common' : level <= 10 ? 'rare' : level <= 15 ? 'elite' : level <= 19 ? 'legendary' : 'transcendent');

const rarityPriceMultiplier = (rarity) => {
  if (rarity === 'legendary') return 1.5;
  if (rarity === 'transcendent') return 2;
  return 1;
};

const SPECIAL_STAT_LABELS = {
  bossCritChance: '보스전 크리티컬 확률',
  critDamage: '크리티컬 데미지',
  battlePower: '전투력 보너스',
  battleChance: '전투 승률 보너스',
  bossDamage: '보스 피해 보너스',
};

// 장비 ID와 기본 전투력은 유지하면서, 단계가 올라갈수록 카드 RPG다운 패시브가 붙어요.
// 수치는 기존 rpg 문서에 저장하지 않고 아이템 ID·단계에서 계산하므로 기존 사용자도 즉시 적용됩니다.
function specialStatsFor(slot, level, rarity) {
  if (slot === 'pet') {
    const stats = [];
    if (level >= 6) {
      stats.push({
        key: 'bossCritChance',
        label: SPECIAL_STAT_LABELS.bossCritChance,
        value: 1 + Math.floor(level / 5),
      });
    }
    if (level >= 16) {
      stats.push({
        key: 'critDamage',
        label: SPECIAL_STAT_LABELS.critDamage,
        value: 4 + Math.floor(level / 3),
      });
    }
    if (rarity === 'transcendent' && level === 20) {
      stats.push({
        key: 'bossDamage',
        label: SPECIAL_STAT_LABELS.bossDamage,
        value: 8,
      });
    }
    return stats;
  }
  if (level < 6) return [];
  const profile = {
    helmet: ['battleChance', 1 + Math.floor(level / 6)],
    weapon: ['bossDamage', 2 + Math.floor(level / 4)],
    armor: ['battlePower', 1 + Math.floor(level / 7)],
    gloves: ['battlePower', 1 + Math.floor(level / 6)],
    shoes: ['battleChance', 1 + Math.floor(level / 7)],
    accessory: ['bossCritChance', 1 + Math.floor(level / 5)],
  }[slot];
  if (!profile) return [];
  const [firstKey, firstValue] = profile;
  const stats = [{ key: firstKey, label: SPECIAL_STAT_LABELS[firstKey], value: firstValue }];
  if (level >= 16) {
    const second = {
      helmet: ['bossCritChance', 2 + Math.floor(level / 8)],
      weapon: ['critDamage', 3 + Math.floor(level / 2)],
      armor: ['battleChance', 1 + Math.floor(level / 8)],
      gloves: ['bossDamage', 2 + Math.floor(level / 5)],
      shoes: ['battlePower', 1 + Math.floor(level / 8)],
      accessory: ['critDamage', 3 + Math.floor(level / 2)],
    }[slot];
    if (second) stats.push({ key: second[0], label: SPECIAL_STAT_LABELS[second[0]], value: second[1] });
  }
  if (rarity === 'transcendent' && level === 20) {
    stats[0] = { ...stats[0], value: stats[0].value + 2 };
  }
  return stats;
}

const gearItems = HERO_SLOTS.flatMap(([slot]) => {
  let previousPrice = 0;
  return Array.from({ length: 20 }, (_, index) => {
    const level = index + 1;
    const legacy = (LEGACY_GEAR[slot] || {})[level];
    const rarity = rarityOfLevel(level);
    const power = POWER_BY_SLOT[slot][index];
    const basePrice = legacy?.price || Math.round(50 + power * 10 + level * 15);
    const price = Math.max(
      previousPrice + 1,
      Math.round(basePrice * rarityPriceMultiplier(rarity)),
    );
    previousPrice = price;
    return {
      id: legacy?.id || `hero_${slot}_${level}`,
      slot,
      level,
      rarity,
      rarityLabel: HERO_RARITIES[rarity].label,
      visualKey: `${slot}-${level === 20 ? 5 : Math.ceil(level / 5)}`,
      name: `${HERO_RARITIES[rarity].label} ${GEAR_NAMES[slot][index]}`,
      emoji: GEAR_EMOJIS[slot][index],
      visual: visualForItem(slot, level, rarity, index),
      price,
      power,
      specialStats: specialStatsFor(slot, level, rarity),
    };
  });
});

const PET_NAMES = [
  '루미 슬라임', '네온 폭스', '코랄 바다표범', '모스 판다', '블레이즈 캣',
  '문쉐이드 울프', '브램블 디어', '볼트 호크', '젬 터틀', '프로스트 펭귄',
  '골드 몽키', '메테오 드레이크', '나이트 올빼미', '솔라 라이언', '템페스트 이글',
  '보이드 바이퍼', '스카이 웨일', '아케인 유니콘', '에인션트 그리핀', '세라핌 피닉스',
];
const PET_EMOJIS = ['●', '◆', '◉', '✿', '✦', '☾', '❧', 'ϟ', '◇', '❄', '✧', '◈', '☽', '☀', '⚡', '◒', '◌', '✦', '♜', '✹'];
let previousPetPrice = 0;
const petItems = Array.from({ length: 20 }, (_, index) => {
  const level = index + 1;
  const rarity = rarityOfLevel(level);
  const critChance = Math.round(5 + (level - 1) * (75 / 19));
  const basePrice = 180 + level * 95 + (rarity === 'transcendent' ? 500 : rarity === 'legendary' ? 220 : 0);
  const price = Math.max(
    previousPetPrice + 1,
    Math.round(basePrice * rarityPriceMultiplier(rarity)),
  );
  previousPetPrice = price;
  return {
    id: 'hero_pet_' + level,
    slot: 'pet',
    level,
    rarity,
    rarityLabel: HERO_RARITIES[rarity].label,
    visualKey: 'pet-' + level,
    name: PET_NAMES[index],
    emoji: PET_EMOJIS[index],
    visual: visualForItem('pet', level, rarity, index),
    price,
    power: 0,
    critChance,
    specialStats: specialStatsFor('pet', level, rarity),
  };
});

export const HERO_PETS = petItems;
export const HERO_ITEMS = [...HERO_CHARACTERS, ...gearItems, ...petItems];
export const HERO_ITEM_MAP = Object.fromEntries(HERO_ITEMS.map((item) => [item.id, item]));
export const HERO_GEAR_BY_SLOT = Object.fromEntries(HERO_SLOTS.map(([slot]) => [
  slot, gearItems.filter((item) => item.slot === slot),
]));

export const HERO_ENHANCEMENT_MAX_LEVEL = 10;
export const HERO_ENHANCEMENT_POWER_PER_LEVEL = 2;

export function heroEnhancementCost(targetLevel) {
  const level = clamp(Math.floor(Number(targetLevel) || 1), 1, HERO_ENHANCEMENT_MAX_LEVEL);
  return level * 10;
}

export function heroEnhancementSuccessRate(targetLevel) {
  const level = clamp(Math.floor(Number(targetLevel) || 1), 1, HERO_ENHANCEMENT_MAX_LEVEL);
  return level === HERO_ENHANCEMENT_MAX_LEVEL ? 5 : 100 - level * 10;
}

export function heroEnhancementFor(raw = {}, itemId) {
  const source = raw.enhancements?.[itemId] || {};
  const level = clamp(Number(source.level) || 0, 0, HERO_ENHANCEMENT_MAX_LEVEL);
  return {
    level,
    invested: Math.max(0, Math.floor(Number(source.invested) || 0)),
    attempts: Math.max(0, Math.floor(Number(source.attempts) || 0)),
    specialAbility: source.specialAbility && typeof source.specialAbility === 'object'
      ? { ...source.specialAbility }
      : null,
  };
}

export function heroEnhancementSpecialFor(item, level) {
  if (!item || Number(level) < HERO_ENHANCEMENT_MAX_LEVEL) return null;
  return {
    key: 'enhancementPower',
    label: '강화 특수능력',
    value: 10,
  };
}

export function heroEnhancementStats(raw = {}, itemId) {
  const item = HERO_ITEM_MAP[itemId];
  const enhancement = heroEnhancementFor(raw, itemId);
  const special = enhancement.specialAbility || heroEnhancementSpecialFor(item, enhancement.level);
  return special ? [special] : [];
}

export function heroItemPower(item, enhancement = {}) {
  if (!item) return 0;
  const level = clamp(Number(enhancement.level) || 0, 0, HERO_ENHANCEMENT_MAX_LEVEL);
  const specialPower = level >= HERO_ENHANCEMENT_MAX_LEVEL ? 10 : 0;
  return Math.max(0, Number(item.power) || 0) + level * HERO_ENHANCEMENT_POWER_PER_LEVEL + specialPower;
}

export function heroItemValue(item, raw = {}) {
  if (!item) return 0;
  return Math.max(0, Number(item.price) || 0) + heroEnhancementFor(raw, item.id).invested;
}

export function heroDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const HERO_TITLES = [
  '용감한', '위대한', '불굴의', '전설의', '빛나는',
  '강인한', '무적의', '정복자', '신화의', '천공의',
];

export function heroTitleFor(clearedLevel) {
  const level = Math.max(0, Math.floor(Number(clearedLevel) || 0));
  const index = Math.floor(level / 10) - 1;
  return index >= 0 ? HERO_TITLES[Math.min(index, HERO_TITLES.length - 1)] : '';
}

export function normalizeHero(raw = {}) {
  // 화면이 이해하지 못하는 미래/구버전 필드도 먼저 보존합니다.
  // 정규화는 계산용 값만 보정하고, 학생 문서에 있던 데이터 자체를 삭제하지 않아요.
  const source = raw && typeof raw === 'object' ? raw : {};
  const listedOwned = Array.isArray(source.owned)
    ? [...new Set(source.owned.filter((id) => typeof id === 'string' && id.trim()))]
    : [];
  const equipment = source.equipment && typeof source.equipment === 'object' ? { ...source.equipment } : {};
  // 구버전 문서에는 장착 정보만 있고 owned 배열에 캐릭터·장비가 빠진 경우가 있어요.
  // 장착되어 있다는 것은 이미 구매했다는 뜻이므로 계산용 소유 목록에 합쳐 기존 학생도 대결·인벤토리를 이용하게 합니다.
  const equippedIds = Object.values(equipment).filter((id) => typeof id === 'string' && id.trim());
  const implicitOwned = [source.character, source.pet, ...equippedIds]
    .filter((id) => HERO_ITEM_MAP[id]);
  const owned = [...new Set([...listedOwned, ...implicitOwned])];
  const character = HERO_ITEM_MAP[source.character]?.slot === 'character'
    ? source.character
    : owned.find((id) => HERO_ITEM_MAP[id]?.slot === 'character') || null;
  const pet = HERO_ITEM_MAP[source.pet]?.slot === 'pet'
    ? source.pet
    : owned.find((id) => HERO_ITEM_MAP[id]?.slot === 'pet') || null;
  const bossProgress = source.bossProgress && typeof source.bossProgress === 'object'
    ? Object.fromEntries(Object.entries(source.bossProgress)
      .map(([level, damage]) => [level, Math.max(0, Number(damage) || 0)]))
    : {};
  const enhancements = source.enhancements && typeof source.enhancements === 'object'
    ? Object.fromEntries(Object.entries(source.enhancements)
      .filter(([itemId]) => typeof itemId === 'string' && itemId.trim())
      .map(([itemId, value]) => [itemId, {
        ...(value && typeof value === 'object' ? value : {}),
        level: clamp(Number(value?.level) || 0, 0, HERO_ENHANCEMENT_MAX_LEVEL),
        invested: Math.max(0, Math.floor(Number(value?.invested) || 0)),
        attempts: Math.max(0, Math.floor(Number(value?.attempts) || 0)),
        specialAbility: value?.specialAbility && typeof value.specialAbility === 'object'
          ? { ...value.specialAbility }
          : null,
      }]))
    : {};
  const shop = source.shop && typeof source.shop === 'object' ? { ...source.shop } : {};
  return {
    ...source,
    character,
    pet,
    name: typeof source.name === 'string' ? source.name.trim().slice(0, 20) : '',
    nameChangeCount: Math.max(0, Number(source.nameChangeCount) || 0),
    owned,
    equipment,
    enhancements,
    bossProgress,
    clearedLevel: clamp(Number(source.clearedLevel) || 0, 0, 100),
    battleDate: source.battleDate || '',
    battleCount: Math.max(0, Number(source.battleCount) || 0),
    shop: {
      ...shop,
      date: shop.date || '',
      refreshes: Math.max(0, Number(shop.refreshes) || 0),
    },
    lastBattle: source.lastBattle || null,
  };
}

export function heroDisplayName(raw) {
  const hero = normalizeHero(raw);
  return [heroTitleFor(hero.clearedLevel), hero.name || '용사'].filter(Boolean).join(' ');
}

export function heroPower(raw) {
  const hero = normalizeHero(raw);
  const character = HERO_ITEM_MAP[hero.character];
  const characterPower = heroItemPower(character, heroEnhancementFor(hero, hero.character));
  const gearPower = HERO_SLOTS.reduce((total, [slot]) => {
    const id = hero.equipment[slot];
    const item = HERO_ITEM_MAP[id];
    return total + (item?.slot === slot ? heroItemPower(item, heroEnhancementFor(hero, id)) : 0);
  }, 0);
  const pet = HERO_ITEM_MAP[hero.pet];
  const petPower = pet?.slot === 'pet' ? heroItemPower(pet, heroEnhancementFor(hero, hero.pet)) : 0;
  return characterPower + gearPower + petPower;
}

/** 장비 패시브까지 반영한 실제 전투용 전투력입니다. 기본 전투력·자산 계산은 그대로 둡니다. */
export function heroBattlePower(raw) {
  const hero = normalizeHero(raw);
  const base = heroPower(hero);
  const bonus = Math.max(0, heroSpecialValue(hero, 'battlePower'));
  return Math.floor(base * (1 + bonus / 100));
}

export function formatHeroSpecialStat(stat) {
  if (!stat?.key || !Number.isFinite(Number(stat.value))) return '';
  const label = stat.label || SPECIAL_STAT_LABELS[stat.key] || stat.key;
  return `${label} +${Math.max(0, Number(stat.value))}%`;
}

export function formatHeroSpecialStats(item) {
  return Array.isArray(item?.specialStats)
    ? item.specialStats.map(formatHeroSpecialStat).filter(Boolean)
    : [];
}

function equippedHeroItems(hero) {
  return [
    ...HERO_SLOTS
    .map(([slot]) => HERO_ITEM_MAP[hero.equipment[slot]])
    .filter((item) => item?.slot && item.slot !== 'pet'),
    HERO_ITEM_MAP[hero.pet],
  ].filter(Boolean);
}

export function heroSpecialValue(raw, key) {
  const hero = normalizeHero(raw);
  return equippedHeroItems(hero).reduce((total, item) => (
    total + (item.specialStats || [])
      .filter((stat) => stat.key === key)
      .reduce((sum, stat) => sum + (Number(stat.value) || 0), 0)
  ), 0);
}

export function bossCriticalChance(raw) {
  const hero = normalizeHero(raw);
  return clamp(
    (HERO_ITEM_MAP[hero.pet]?.critChance || 0) + heroSpecialValue(hero, 'bossCritChance'),
    0,
    100,
  );
}

export function criticalDamageBonus(raw) {
  return heroSpecialValue(raw, 'critDamage');
}

export const BOSS_CRITICAL_BASE_MULTIPLIER = 2;

// 펫의 보스전 치명타는 일반 공격을 강화하지 않고, 치명타가 실제로 발생했을 때만 기본 2배가 됩니다.
// 장비·펫에 붙은 치명타 피해 수치는 이 기본 배율에 퍼센트포인트로 더해져요.
// 예: 치명타 피해 +5% → 2 + 0.05 = 2.05배
export function bossCriticalMultiplier(raw) {
  const bonusPercent = Math.max(0, Math.round(criticalDamageBonus(raw)));
  return (BOSS_CRITICAL_BASE_MULTIPLIER * 100 + bonusPercent) / 100;
}

export function battleDamage(power, monster, raw, criticalRoll = Math.random()) {
  const base = Math.max(1, Math.floor(Number(power) || 0));
  const criticalChance = monster?.boss ? bossCriticalChance(raw) : 0;
  const critical = criticalChance > 0 && criticalRoll < criticalChance / 100;
  const criticalDamage = Math.max(0, Math.round(criticalDamageBonus(raw)));
  const criticalMultiplierPercent = Math.round(bossCriticalMultiplier(raw) * 100);
  const criticalMultiplier = criticalMultiplierPercent / 100;
  const bossDamage = monster?.boss ? Math.max(0, Math.round(heroSpecialValue(raw, 'bossDamage'))) : 0;
  const boostedBase = Math.max(1, Math.floor((base * (100 + bossDamage)) / 100));
  return {
    // 부동소수점 오차를 피하기 위해 2.05배를 205% 정수로 계산해요.
    damage: critical ? Math.floor((boostedBase * criticalMultiplierPercent) / 100) : boostedBase,
    critical,
    criticalChance,
    criticalDamage,
    criticalMultiplier,
    bossDamage,
  };
}

export function battleChance(power, monsterPower) {
  if (power <= 0) return 0;
  if (monsterPower <= 0) return 1;
  // 전투력 80 대 몬스터 20이면 80/(80+20)=80%예요.
  return clamp(power / (power + monsterPower), 0, 1);
}

/** 장비의 승률 패시브를 반영합니다. 친구 대결에도 같은 규칙을 적용합니다. */
export function heroBattleChance(power, monsterPower, raw) {
  const bonus = Math.max(0, heroSpecialValue(raw, 'battleChance'));
  return clamp(battleChance(power, monsterPower) + bonus / 100, 0, 1);
}

/** 현재 장착 조합이 전투에 주는 효과를 한 번에 보여주기 위한 읽기 전용 프로필입니다. */
export function heroBattleProfile(raw) {
  const hero = normalizeHero(raw);
  const powerBonus = Math.max(0, heroSpecialValue(hero, 'battlePower'));
  const chanceBonus = Math.max(0, heroSpecialValue(hero, 'battleChance'));
  const bossDamageBonus = Math.max(0, heroSpecialValue(hero, 'bossDamage'));
  const criticalChance = bossCriticalChance(hero);
  const criticalDamage = criticalDamageBonus(hero);
  return {
    power: heroBattlePower(hero),
    powerBonus,
    chanceBonus,
    bossDamageBonus,
    criticalChance,
    criticalDamage,
    criticalMultiplier: bossCriticalMultiplier(hero),
  };
}

export const HERO_EXTRA_BATTLE_COST = 15;

export function heroExtraBattleCost(attempts, limit = 10) {
  const used = Math.max(0, Math.floor(Number(attempts) || 0));
  const baseLimit = Math.max(1, Math.floor(Number(limit) || 10));
  return HERO_EXTRA_BATTLE_COST + Math.max(0, used - baseLimit) * 3;
}

export const HERO_DUEL_LIMIT = 10;
export const HERO_DUEL_EXTRA_COST = 2;
export const HERO_DUEL_WIN_REWARD = 2;

// 친구 대결 순위 차이: 음수는 내 위, 양수는 내 아래예요.
export function heroDuelWinReward(rankDelta) {
  const delta = Number(rankDelta);
  if (delta === -2) return 4;
  if (delta === -1) return 3;
  if (delta === 1) return 2;
  if (delta === 2) return 1;
  return HERO_DUEL_WIN_REWARD;
}

export function heroDuelExtraCost(attempts) {
  return Math.max(0, Number(attempts) || 0) >= HERO_DUEL_LIMIT ? HERO_DUEL_EXTRA_COST : 0;
}

// 용사 배틀은 10단계 단위로 기본 보상이 올라가고, 일반 보스는 기존 10배에서 줄여 일반 보상의 5배를 지급합니다.
// 최종 보스만 최종 도전 보상으로 기존과 같은 10배를 지급합니다.
export function heroBattleWinReward(level, boss = false, baseReward = 10) {
  const safeLevel = clamp(Math.floor(Number(level) || 1), 1, 100);
  const tier = Math.ceil(safeLevel / 10);
  const safeBaseReward = Math.max(0, Math.floor(Number(baseReward) || 0));
  const normalReward = tier === 10 ? safeBaseReward * 100 : safeBaseReward * tier;
  if (!boss) return normalReward;
  return safeLevel === 100 ? normalReward * 10 : normalReward * 5;
}

export function battleConfig(klass = {}) {
  const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  return {
    limit: clamp(Math.floor(numberOr(klass.heroBattleLimit, 10)), 1, 100),
    winReward: clamp(Math.floor(numberOr(klass.heroWinReward, 10)), 0, 100000),
    loseReward: clamp(Math.floor(numberOr(klass.heroLoseReward, 0)), 0, 100000),
    extraBattleCost: HERO_EXTRA_BATTLE_COST,
  };
}

const MONSTER_ARCHETYPES = [
  { kind: 'slime', name: '슬라임', emoji: '🟢', radius: '42% 58% 52% 48%' },
  { kind: 'bat', name: '박쥐', emoji: '🦇', radius: '48% 52% 44% 56%' },
  { kind: 'goblin', name: '고블린', emoji: '👺', radius: '36% 64% 58% 42%' },
  { kind: 'boar', name: '멧돼지', emoji: '🐗', radius: '54% 46% 48% 52%' },
  { kind: 'spider', name: '거미', emoji: '🕷️', radius: '50%' },
  { kind: 'imp', name: '임프', emoji: '👹', radius: '45% 55% 60% 40%' },
  { kind: 'orc', name: '오크', emoji: '👺', radius: '38% 62% 50% 50%' },
  { kind: 'swamp', name: '늪지괴물', emoji: '🐊', radius: '60% 40% 42% 58%' },
  { kind: 'wolf', name: '얼음 늑대', emoji: '🐺', radius: '46% 54% 54% 46%' },
  { kind: 'bull', name: '미노타우로스', emoji: '🐂', radius: '42% 58% 58% 42%' },
  { kind: 'plant', name: '가시꽃', emoji: '🌺', radius: '48% 52% 35% 65%' },
  { kind: 'mushroom', name: '버섯요정', emoji: '🍄', radius: '58% 42% 48% 52%' },
  { kind: 'crab', name: '불꽃 게', emoji: '🦀', radius: '50% 50% 44% 56%' },
  { kind: 'jellyfish', name: '전기 해파리', emoji: '🪼', radius: '54% 46% 62% 38%' },
  { kind: 'dragon', name: '아기 드래곤', emoji: '🐉', radius: '44% 56% 52% 48%' },
  { kind: 'sphinx', name: '사막 스핑크스', emoji: '🦁', radius: '46% 54% 46% 54%' },
  { kind: 'robot', name: '고철 로봇', emoji: '🤖', radius: '18% 82% 22% 78%' },
  { kind: 'ghost', name: '달빛 유령', emoji: '👻', radius: '52% 48% 38% 62%' },
  { kind: 'kraken', name: '심해 문어', emoji: '🐙', radius: '50% 50% 60% 40%' },
  { kind: 'phoenix', name: '불사조', emoji: '🦅', radius: '42% 58% 48% 52%' },
];
const MONSTER_VARIANTS = ['새벽', '황혼', '청록', '자홍', '별빛'];
const MONSTER_PALETTES = [
  ['#34d399', '#065f46'], ['#60a5fa', '#1e3a8a'], ['#f472b6', '#831843'],
  ['#fbbf24', '#92400e'], ['#a78bfa', '#4c1d95'], ['#fb7185', '#881337'],
  ['#22d3ee', '#164e63'], ['#bef264', '#365314'], ['#fb923c', '#7c2d12'],
  ['#c084fc', '#581c87'],
];
const MONSTER_GLOWS = ['#a7f3d0', '#bae6fd', '#fbcfe8', '#fef3c7', '#ddd6fe', '#fecdd3', '#cffafe', '#ecfccb', '#fed7aa', '#f3e8ff'];

const MONSTER_DESIGNS = Array.from({ length: 100 }, (_, index) => {
  const level = index + 1;
  const species = MONSTER_ARCHETYPES[index % MONSTER_ARCHETYPES.length];
  const variantIndex = Math.floor(index / MONSTER_ARCHETYPES.length) % MONSTER_VARIANTS.length;
  const palette = MONSTER_PALETTES[(index * 7 + variantIndex) % MONSTER_PALETTES.length];
  const boss = level % 10 === 0;
  return {
    level,
    name: `${MONSTER_VARIANTS[variantIndex]} ${species.name}`,
    emoji: species.emoji,
    boss,
    power: Math.floor((30 + level * 4.5 + Math.pow(level, 1.2) * 1.5) * (1 + Math.floor((level - 1) / 10) * 0.1)),
    maxHp: boss ? Math.floor(250 + level * 70 + level * level * 0.8) : 1,
    visual: {
      key: `monster-${level}`,
      kind: species.kind,
      radius: species.radius,
      body: palette[0],
      accent: palette[1],
      glow: MONSTER_GLOWS[(index * 3 + variantIndex) % MONSTER_GLOWS.length],
      variant: variantIndex,
      mark: (index * 13 + 7) % 10,
      emoji: species.emoji,
    },
  };
});

export function monsterForLevel(level) {
  const safeLevel = clamp(Math.floor(Number(level) || 1), 1, 100);
  return MONSTER_DESIGNS[safeLevel - 1];
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function weightedSample(items, random, count) {
  const pool = [...items];
  const picked = [];
  while (pool.length && picked.length < count) {
    const total = pool.reduce((sum, item) => sum + HERO_RARITIES[item.rarity].weight, 0);
    let target = random() * total;
    let index = 0;
    for (; index < pool.length - 1; index += 1) {
      target -= HERO_RARITIES[pool[index].rarity].weight;
      if (target <= 0) break;
    }
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

// 같은 학급의 학생은 같은 날짜·새로고침 번호에서 같은 3개를 보며, 새로고침 횟수는 학생별로 제한해요.
export function heroShopFor(classId, date = heroDateKey(), refreshes = 0) {
  let state = hashSeed(`${classId}:${date}:${refreshes}`);
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return Object.fromEntries([...HERO_SLOTS, HERO_PET_SLOT].map(([slot]) => [
    slot,
    weightedSample(slot === 'pet' ? HERO_PETS : HERO_GEAR_BY_SLOT[slot], random, 3).map((item) => item.id),
  ]));
}
