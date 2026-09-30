// 장비 레이어는 기본 캐릭터(hero-guardian-*-base-cutout.webp)와 같은 2:3 화면 크기로 만든
// 투명 이미지입니다. 위치·크기 보정 없이 기본 캐릭터와 같은 상자에 겹치기만 하면 몸에 맞습니다.
const LOADOUT_ART = import.meta.glob('../assets/hero-loadout/*/*/*.webp', {
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
  const key = `../assets/hero-loadout/${normalizeGender(characterId)}/${slot}/${normalizeRarity(rarity)}.webp`;
  return LOADOUT_ART[key] || null;
}
