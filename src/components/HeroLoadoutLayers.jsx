import HeroCharacterArt from './HeroCharacterArt.jsx';
import { HERO_LOADOUT_LAYER_ORDER, heroLoadoutArtFor } from '../lib/heroLoadoutArt';

const LAYER_Z_INDEX = {
  shoes: 1,
  armor: 2,
  gloves: 3,
  weapon: 4,
  accessory: 5,
  helmet: 6,
};

export default function HeroLoadoutLayers({ characterId, equipmentItems }) {
  const equippedBySlot = new Map(equipmentItems);

  return (
    <div className="hero-loadout-layers" aria-label="현재 장착 장비 외형">
      {HERO_LOADOUT_LAYER_ORDER.map((slot) => {
        const item = equippedBySlot.get(slot);
        if (!item) return null;

        const src = heroLoadoutArtFor(characterId, slot, item.rarity);
        if (!src) return null;

        return (
          <HeroCharacterArt
            key={`${slot}-${item.id}-${item.rarity || 'common'}`}
            className={`hero-loadout-layer hero-loadout-layer-${slot} hero-loadout-layer-grade-${item.rarity || 'common'}`}
            src={src}
            alt=""
            style={{ zIndex: LAYER_Z_INDEX[slot] }}
          />
        );
      })}
    </div>
  );
}
