import HeroCharacterArt from './HeroCharacterArt.jsx';
import { HERO_LOADOUT_LAYER_ORDER, heroLoadoutArtFor } from '../lib/heroLoadoutArt';

const LAYER_Z_INDEX = {
  shoes: 1,
  armor: 2,
  weapon: 3,
  gloves: 4,
  accessory: 5,
  helmet: 6,
};

const POSITIONED_LAYER_STYLES = {
  hero_male: { transform: 'translate3d(10%, -2.5%, 0)' },
  hero_female: { transform: 'translate3d(7%, -1.6%, 0)' },
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

        const layerStyle = {
          zIndex: LAYER_Z_INDEX[slot],
          ...(slot === 'weapon' ? POSITIONED_LAYER_STYLES[characterId] : {}),
          ...(slot === 'gloves' ? { filter: 'drop-shadow(0 5px 4px rgba(4, 7, 30, .72))' } : {}),
        };

        return (
          <HeroCharacterArt
            key={`${slot}-${item.id}-${item.rarity || 'common'}`}
            className={`hero-loadout-layer hero-loadout-layer-${slot} hero-loadout-layer-grade-${item.rarity || 'common'}`}
            src={src}
            alt=""
            style={layerStyle}
          />
        );
      })}
    </div>
  );
}
