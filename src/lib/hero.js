const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const HERO_SLOTS = [
  ['helmet', '헬멧'],
  ['weapon', '무기'],
  ['armor', '갑옷'],
  ['shoes', '신발'],
  ['accessory', '장신구'],
];

export const HERO_ITEMS = [
  { id: 'hero_male', slot: 'character', name: '남자 용사', emoji: '🧙‍♂️', price: 100, power: 12 },
  { id: 'hero_female', slot: 'character', name: '여자 용사', emoji: '🧙‍♀️', price: 100, power: 14 },

  { id: 'hero_helmet_cloth', slot: 'helmet', name: '천 모자', emoji: '🧢', price: 50, power: 3 },
  { id: 'hero_helmet_iron', slot: 'helmet', name: '철제 헬멧', emoji: '⛑️', price: 140, power: 12 },
  { id: 'hero_helmet_knight', slot: 'helmet', name: '기사 헬멧', emoji: '🪖', price: 320, power: 30 },
  { id: 'hero_helmet_dragon', slot: 'helmet', name: '용의 투구', emoji: '🐲', price: 800, power: 65 },

  { id: 'hero_weapon_stick', slot: 'weapon', name: '나무 막대기', emoji: '🪵', price: 60, power: 5 },
  { id: 'hero_weapon_iron', slot: 'weapon', name: '철검', emoji: '⚔️', price: 180, power: 18 },
  { id: 'hero_weapon_flame', slot: 'weapon', name: '불꽃 검', emoji: '🔥', price: 450, power: 48 },
  { id: 'hero_weapon_dragon', slot: 'weapon', name: '용의 검', emoji: '🗡️', price: 1100, power: 105 },

  { id: 'hero_armor_cloth', slot: 'armor', name: '천 갑옷', emoji: '🥋', price: 70, power: 4 },
  { id: 'hero_armor_chain', slot: 'armor', name: '사슬 갑옷', emoji: '⛓️', price: 220, power: 22 },
  { id: 'hero_armor_knight', slot: 'armor', name: '기사 갑옷', emoji: '🛡️', price: 560, power: 58 },
  { id: 'hero_armor_dragon', slot: 'armor', name: '용의 갑옷', emoji: '🐉', price: 1300, power: 145 },

  { id: 'hero_shoes_sandal', slot: 'shoes', name: '가죽 샌들', emoji: '👡', price: 50, power: 3 },
  { id: 'hero_shoes_boots', slot: 'shoes', name: '전투화', emoji: '🥾', price: 160, power: 15 },
  { id: 'hero_shoes_wing', slot: 'shoes', name: '날개 신발', emoji: '🪽', price: 420, power: 40 },
  { id: 'hero_shoes_dragon', slot: 'shoes', name: '용의 발톱', emoji: '🐾', price: 900, power: 85 },

  { id: 'hero_accessory_lucky', slot: 'accessory', name: '행운의 부적', emoji: '🍀', price: 100, power: 6 },
  { id: 'hero_accessory_ruby', slot: 'accessory', name: '불꽃 루비', emoji: '♦️', price: 350, power: 28 },
  { id: 'hero_accessory_crown', slot: 'accessory', name: '왕의 보석', emoji: '👑', price: 850, power: 75 },
];

export const HERO_ITEM_MAP = Object.fromEntries(HERO_ITEMS.map((item) => [item.id, item]));

export function normalizeHero(raw = {}) {
  const owned = Array.isArray(raw.owned)
    ? [...new Set(raw.owned.filter((id) => HERO_ITEM_MAP[id]))]
    : [];
  const equipment = raw.equipment && typeof raw.equipment === 'object' ? { ...raw.equipment } : {};
  const character = owned.includes(raw.character) && HERO_ITEM_MAP[raw.character]?.slot === 'character'
    ? raw.character
    : null;
  return {
    character,
    owned,
    equipment,
    clearedLevel: clamp(Number(raw.clearedLevel) || 0, 0, 100),
    lastBattle: raw.lastBattle || null,
  };
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

const MONSTER_NAMES = [
  '풀숲 슬라임', '길 잃은 박쥐', '돌멩이 고블린', '사나운 멧돼지', '동굴 거미',
  '불씨 임프', '숲의 오크', '독 늪지괴물', '얼음 늑대', '황야의 미노타우로스',
];
const MONSTER_EMOJIS = ['🟢', '🦇', '👺', '🐗', '🕷️', '👹', '👺', '🐊', '🐺', '🐂'];

export function monsterForLevel(level) {
  const safeLevel = clamp(Math.floor(Number(level) || 1), 1, 100);
  const tier = Math.floor((safeLevel - 1) / 10);
  const numberInTier = (safeLevel - 1) % 10;
  const baseName = MONSTER_NAMES[tier % MONSTER_NAMES.length];
  const boss = safeLevel % 10 === 0;
  const power = Math.floor(30 + safeLevel * 4.5 + Math.pow(safeLevel, 1.2) * 1.5);
  const reward = Math.floor(15 + safeLevel * 3 + (boss ? safeLevel * 2 : 0));
  return {
    level: safeLevel,
    name: boss ? `${baseName} 대장` : `${baseName} ${numberInTier + 1}호`,
    emoji: boss ? '👑' : MONSTER_EMOJIS[tier % MONSTER_EMOJIS.length],
    power,
    reward,
    boss,
  };
}

// 장비를 충분히 갖춰도 운이 필요한 구조로, 100단계 완주가 쉽게 끝나지 않도록 조정했어요.
export function battleChance(power, monsterPower) {
  if (power <= 0 || monsterPower <= 0) return 0;
  return clamp(0.1 + (power / monsterPower) * 0.45, 0.08, 0.88);
}

