// 완성형 원본의 전신 실루엣을 그대로 사용합니다. HeroCharacterArt가 생성
// 이미지의 체크무늬 배경만 제거하므로 갑옷·망토·부츠 크기가 보존됩니다.
const LOADOUT_ART = import.meta.glob('../assets/hero-loadout/*/*/*.png', {
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
  const key = `../assets/hero-loadout/${normalizeGender(characterId)}/${slot}/${normalizeRarity(rarity)}.png`;
  return LOADOUT_ART[key] || null;
}
