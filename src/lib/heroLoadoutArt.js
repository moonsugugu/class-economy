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
