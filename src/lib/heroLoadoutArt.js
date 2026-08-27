// 전처리된 레이어는 슬롯별 안전 영역에 맞춰 정렬되고 투명 배경으로 저장됩니다.
// 원본 생성 PNG를 그대로 겹치면 등급마다 캔버스 안 위치가 달라져 조합이 흔들립니다.
const LOADOUT_ART = import.meta.glob('../assets/hero-loadout-composed/*/*/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});

export const HERO_LOADOUT_LAYER_ORDER = ['shoes', 'armor', 'gloves', 'weapon', 'accessory', 'helmet'];

const RARITIES = new Set(['common', 'rare', 'elite', 'legendary', 'transcendent']);
const SLOTS = new Set(['helmet', 'weapon', 'armor', 'gloves', 'shoes', 'accessory']);

const normalizeGender = (characterId) => (characterId === 'hero_female' ? 'female' : 'male');
const normalizeRarity = (rarity) => (RARITIES.has(rarity) ? rarity : 'common');

export function heroLoadoutArtFor(characterId, slot, rarity) {
  if (!SLOTS.has(slot)) return null;
  const key = `../assets/hero-loadout-composed/${normalizeGender(characterId)}/${slot}/${normalizeRarity(rarity)}.png`;
  return LOADOUT_ART[key] || null;
}
