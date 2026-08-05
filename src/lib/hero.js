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
  { id: 'hero_male', slot: 'character', name: '소년 용사', emoji: '🧒', price: 100, power: 12 },
  { id: 'hero_female', slot: 'character', name: '소녀 용사', emoji: '👧', price: 100, power: 14 },
];

const GEAR_NAMES = {
  helmet: ['천 모자', '가죽 모자', '나무 헬멧', '청동 헬멧', '철제 헬멧', '강철 헬멧', '은빛 투구', '금빛 투구', '마법 투구', '수정 투구', '기사 헬멧', '빛의 헬멧', '왕국 투구', '성기사 투구', '고대 투구', '용의 투구', '화염 투구', '폭풍 투구', '별빛 투구', '천공의 투구'],
  weapon: ['나무 막대기', '돌칼', '청동검', '철검', '강철검', '은빛 검', '금빛 검', '독검', '번개 창', '얼음 도끼', '불꽃 검', '빛의 검', '왕국 검', '성기사 검', '고대 검', '용의 검', '화염 대검', '폭풍 창', '별빛 활', '천공의 검'],
  armor: ['천 갑옷', '가죽 조끼', '나무 갑옷', '청동 갑옷', '사슬 갑옷', '강철 갑옷', '은빛 갑옷', '금빛 갑옷', '마법 갑옷', '수정 갑옷', '기사 갑옷', '빛의 갑옷', '왕국 갑옷', '성기사 갑옷', '고대 갑옷', '용의 갑옷', '화염 갑옷', '폭풍 갑옷', '별빛 갑옷', '천공의 갑옷'],
  gloves: ['천 장갑', '가죽 장갑', '나무 건틀릿', '청동 건틀릿', '철제 건틀릿', '강철 건틀릿', '은빛 건틀릿', '금빛 건틀릿', '마법 장갑', '수정 건틀릿', '기사 건틀릿', '빛의 건틀릿', '왕국 건틀릿', '성기사 건틀릿', '고대 건틀릿', '용의 건틀릿', '화염 건틀릿', '폭풍 건틀릿', '별빛 건틀릿', '천공의 건틀릿'],
  shoes: ['가죽 샌들', '천 신발', '나무 신발', '청동 장화', '전투화', '강철 장화', '은빛 장화', '금빛 장화', '바람 장화', '얼음 장화', '날개 신발', '빛의 장화', '왕국 장화', '성기사 장화', '고대 장화', '용의 발톱', '화염 장화', '폭풍 장화', '별빛 장화', '천공의 장화'],
  accessory: ['행운의 부적', '나무 구슬', '청동 반지', '철 팔찌', '마법 목걸이', '불꽃 루비', '은빛 반지', '금빛 반지', '바람 보석', '얼음 보석', '기사의 문장', '빛의 목걸이', '왕국 인장', '성기사 메달', '고대 유물', '왕의 보석', '화염 보석', '폭풍 보석', '별빛 보석', '천공의 보석'],
};

const GEAR_EMOJIS = {
  helmet: ['🧢', '🧢', '⛑️', '⛑️', '🪖', '🪖', '🛡️', '👑', '🔮', '💎', '🪖', '✨', '👑', '🛡️', '🏺', '🐲', '🔥', '🌪️', '🌟', '☄️'],
  weapon: ['🪵', '🪨', '🗡️', '⚔️', '⚔️', '🗡️', '⚔️', '🦂', '🔱', '🪓', '🔥', '✨', '⚔️', '🗡️', '🏺', '🗡️', '🔥', '🌪️', '🏹', '⚔️'],
  armor: ['🥋', '🥋', '🪵', '🛡️', '⛓️', '🛡️', '🛡️', '👑', '🔮', '💎', '🛡️', '✨', '👑', '🛡️', '🏺', '🐉', '🔥', '🌪️', '🌟', '☄️'],
  gloves: ['🧤', '🧤', '🥊', '🥊', '🛡️', '🛡️', '⚙️', '✨', '🔮', '💎', '🥊', '🌟', '👑', '🛡️', '🏺', '🐉', '🔥', '🌪️', '🌟', '☄️'],
  shoes: ['👡', '👞', '👞', '🥾', '🥾', '🥾', '👢', '👢', '💨', '❄️', '🪽', '✨', '👢', '🥾', '🏺', '🐾', '🔥', '🌪️', '🌟', '☄️'],
  accessory: ['🍀', '🟤', '🟠', '⚙️', '🔮', '♦️', '⚪', '🟡', '💨', '❄️', '🏅', '✨', '🔱', '🏵️', '🏺', '👑', '🔥', '🌪️', '🌟', '☄️'],
};

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

const SPECIAL_STAT_LABELS = {
  bossCritChance: '보스전 크리티컬 확률',
  critDamage: '크리티컬 데미지',
};
const SPECIAL_STAT_SLOTS = new Set(['weapon', 'accessory', 'gloves']);

// 장비 ID가 같으면 어느 기기에서 보더라도 같은 추가 능력치가 보이도록
// 단계·부위에서 안정적으로 값을 만들어요. 기존 장비 ID와 기본 전투력은 그대로예요.
function specialStatsFor(slot, level, rarity) {
  const transcendent = level === 20 || rarity === 'transcendent';
  if (!transcendent && !SPECIAL_STAT_SLOTS.has(slot)) return [];
  if (!transcendent && rarity === 'common') return [];
  const seed = [...slot].reduce((sum, char) => sum + char.charCodeAt(0), level * 17);
  const firstKey = seed % 2 ? 'bossCritChance' : 'critDamage';
  const valueFor = (key, offset = 0) => key === 'bossCritChance'
    ? 1 + ((seed + offset * 11) % 5)
    : 1 + ((seed + offset * 17) % 10);
  const first = { key: firstKey, label: SPECIAL_STAT_LABELS[firstKey], value: valueFor(firstKey) };
  // 초월 등급은 부위와 상관없이 추가 능력치 하나만 붙어요.
  if (transcendent) return [first];
  if (rarity !== 'legendary') return [first];
  const secondKey = firstKey === 'bossCritChance' ? 'critDamage' : 'bossCritChance';
  return [first, { key: secondKey, label: SPECIAL_STAT_LABELS[secondKey], value: valueFor(secondKey, 1) }];
}

const gearItems = HERO_SLOTS.flatMap(([slot]) => Array.from({ length: 20 }, (_, index) => {
  const level = index + 1;
  const legacy = (LEGACY_GEAR[slot] || {})[level];
  const rarity = rarityOfLevel(level);
  const power = POWER_BY_SLOT[slot][index];
  return {
    id: legacy?.id || `hero_${slot}_${level}`,
    slot,
    level,
    rarity,
    rarityLabel: HERO_RARITIES[rarity].label,
    visualKey: `${slot}-${level === 20 ? 5 : Math.ceil(level / 5)}`,
    name: legacy?.name || `${HERO_RARITIES[rarity].label} ${GEAR_NAMES[slot][index]}`,
    emoji: legacy?.emoji || GEAR_EMOJIS[slot][index],
    price: legacy?.price || Math.round(50 + power * 10 + level * 15),
    power,
    specialStats: specialStatsFor(slot, level, rarity),
  };
}));

const PET_NAMES = [
  '별빛 토끼', '구름 여우', '바다 물개', '초원 판다', '불꽃 고양이',
  '달빛 늑대', '숲의 사슴', '번개 매', '보석 거북', '얼음 펭귄',
  '황금 원숭이', '유성 드래곤', '밤의 부엉이', '태양 사자', '폭풍 독수리',
  '심연의 뱀', '천공의 고래', '마력 유니콘', '고대 그리핀', '신성한 봉황',
];
const PET_EMOJIS = ['🐇', '🦊', '🦭', '🐼', '🐈', '🐺', '🦌', '🦅', '🐢', '🐧', '🐒', '🐲', '🦉', '🦁', '🦅', '🐍', '🐳', '🦄', '🪽', '🔥'];
const petItems = Array.from({ length: 20 }, (_, index) => {
  const level = index + 1;
  const rarity = rarityOfLevel(level);
  const critChance = Math.round(5 + (level - 1) * (75 / 19));
  return {
    id: 'hero_pet_' + level,
    slot: 'pet',
    level,
    rarity,
    rarityLabel: HERO_RARITIES[rarity].label,
    visualKey: 'pet-' + level,
    name: PET_NAMES[index],
    emoji: PET_EMOJIS[index],
    price: 180 + level * 95 + (rarity === 'transcendent' ? 500 : rarity === 'legendary' ? 220 : 0),
    power: 0,
    critChance,
    specialStats: level === 20 ? specialStatsFor('pet', level, rarity) : [],
  };
});

export const HERO_PETS = petItems;
export const HERO_ITEMS = [...HERO_CHARACTERS, ...gearItems, ...petItems];
export const HERO_ITEM_MAP = Object.fromEntries(HERO_ITEMS.map((item) => [item.id, item]));
export const HERO_GEAR_BY_SLOT = Object.fromEntries(HERO_SLOTS.map(([slot]) => [
  slot, gearItems.filter((item) => item.slot === slot),
]));

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
  const owned = Array.isArray(raw.owned)
    ? [...new Set(raw.owned.filter((id) => HERO_ITEM_MAP[id]))]
    : [];
  const equipment = raw.equipment && typeof raw.equipment === 'object' ? { ...raw.equipment } : {};
  const character = owned.includes(raw.character) && HERO_ITEM_MAP[raw.character]?.slot === 'character'
    ? raw.character
    : null;
  const pet = owned.includes(raw.pet) && HERO_ITEM_MAP[raw.pet]?.slot === 'pet'
    ? raw.pet
    : null;
  const bossProgress = raw.bossProgress && typeof raw.bossProgress === 'object'
    ? Object.fromEntries(Object.entries(raw.bossProgress)
      .map(([level, damage]) => [level, Math.max(0, Number(damage) || 0)]))
    : {};
  const shop = raw.shop && typeof raw.shop === 'object' ? { ...raw.shop } : {};
  return {
    character,
    pet,
    name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 20) : '',
    nameChangeCount: Math.max(0, Number(raw.nameChangeCount) || 0),
    owned,
    equipment,
    bossProgress,
    clearedLevel: clamp(Number(raw.clearedLevel) || 0, 0, 100),
    battleDate: raw.battleDate || '',
    battleCount: Math.max(0, Number(raw.battleCount) || 0),
    shop: {
      date: shop.date || '',
      refreshes: Math.max(0, Number(shop.refreshes) || 0),
    },
    lastBattle: raw.lastBattle || null,
  };
}

export function heroDisplayName(raw) {
  const hero = normalizeHero(raw);
  return [heroTitleFor(hero.clearedLevel), hero.name || '용사'].filter(Boolean).join(' ');
}

export function heroPower(raw) {
  const hero = normalizeHero(raw);
  const characterPower = HERO_ITEM_MAP[hero.character]?.power || 0;
  const gearPower = HERO_SLOTS.reduce((total, [slot]) => {
    const id = hero.equipment[slot];
    return total + (HERO_ITEM_MAP[id]?.slot === slot ? HERO_ITEM_MAP[id].power : 0);
  }, 0);
  return characterPower + gearPower;
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

export function battleDamage(power, monster, raw, criticalRoll = Math.random()) {
  const base = Math.max(1, Math.floor(Number(power) || 0));
  const criticalChance = monster?.boss ? bossCriticalChance(raw) : 0;
  const critical = criticalChance > 0 && criticalRoll < criticalChance / 100;
  const criticalDamage = criticalDamageBonus(raw);
  return {
    damage: critical ? Math.floor(base * (2 + criticalDamage / 100)) : base,
    critical,
    criticalChance,
    criticalDamage,
  };
}

export function battleChance(power, monsterPower) {
  if (power <= 0) return 0;
  if (monsterPower <= 0) return 1;
  // 전투력 80 대 몬스터 20이면 80/(80+20)=80%예요.
  return clamp(power / (power + monsterPower), 0, 1);
}

export const HERO_EXTRA_BATTLE_COST = 15;

export function heroExtraBattleCost(attempts, limit = 10) {
  const used = Math.max(0, Math.floor(Number(attempts) || 0));
  const baseLimit = Math.max(1, Math.floor(Number(limit) || 10));
  return HERO_EXTRA_BATTLE_COST + Math.max(0, used - baseLimit);
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

export function battleConfig(klass = {}) {
  const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  return {
    limit: clamp(Math.floor(numberOr(klass.heroBattleLimit, 10)), 1, 100),
    winReward: clamp(Math.floor(numberOr(klass.heroWinReward, 20)), 0, 100000),
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
    power: Math.floor(30 + level * 4.5 + Math.pow(level, 1.2) * 1.5),
    maxHp: boss ? Math.floor(250 + level * 70 + level * level * 0.8) : 1,
    visual: {
      key: `monster-${level}`,
      kind: species.kind,
      radius: species.radius,
      body: palette[0],
      accent: palette[1],
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
