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

// The full-size originals are already aligned for armor, gloves and weapons.
// Only the crossed-leg female shoe drawings and two low-grade forehead pieces
// need local corrections to attach to this exact base pose.
const ORIGINAL_LAYER_STYLE = {
  hero_male: {
    helmet: {
      common: {
        transform: 'translate3d(0, -4.5%, 0) scale3d(.55, .55, 1)',
        transformOrigin: '54.7% 10.8%',
      },
      elite: {
        transform: 'translate3d(0, -6%, 0) scale3d(.72, .72, 1)',
        transformOrigin: '56.8% 15%',
      },
    },
    armor: {
      rare: { transform: 'translate3d(0, 1.5%, 0)' },
    },
    weapon: {
      transcendent: {
        transform: 'translate3d(1.6%, -1.2%, 0) rotate(-1.5deg)',
        transformOrigin: '24% 35%',
      },
    },
  },
  hero_female: {
    helmet: {
      rare: { transform: 'translate3d(0, -3%, 0)' },
    },
    armor: {
      common: {
        transform: 'translate3d(2%, 1%, 0) scale3d(.82, .88, 1)',
        transformOrigin: '52.5% 35%',
      },
      elite: {
        transform: 'translate3d(0, 1%, 0) scale3d(-.92, .92, 1)',
        transformOrigin: '50% 46%',
      },
    },
    shoes: {
      common: { transform: 'translate3d(-1.2%, 22.7%, 0) scale3d(.56, .34, 1)', transformOrigin: '50.3% 65.2%' },
      elite: { transform: 'translate3d(-5%, 5.5%, 0) scale3d(.37, .39, 1)', transformOrigin: '54.2% 82.4%' },
      legendary: { transform: 'translate3d(2.5%, 9.3%, 0) scale3d(.92, .38, 1)', transformOrigin: '46.6% 78.5%' },
      transcendent: { transform: 'translate3d(2.2%, 9.8%, 0) scale3d(.87, .4, 1)', transformOrigin: '47% 78.1%' },
    },
  },
};

// 양쪽 장갑이나 얼굴/몸 장식이 한 PNG에 함께 생성된 경우, 한 번에
// 움직이면 한쪽만 맞습니다. 필요한 영역을 두 장으로 나눠 각 앵커에 붙입니다.
const ORIGINAL_LAYER_PIECES = {
  hero_male: {
    gloves: {
      common: [
        {
          clipPath: 'inset(0 50% 0 0)',
          transform: 'translate3d(7%, -10%, 0) scale3d(.8, .8, 1)',
          transformOrigin: '22% 52%',
        },
        {
          clipPath: 'inset(0 0 0 50%)',
          transform: 'translate3d(0, -10%, 0) scale3d(.8, .8, 1)',
          transformOrigin: '80% 52%',
        },
      ],
    },
    accessory: {
      rare: [
        {
          clipPath: 'inset(0 50% 72% 0)',
          transform: 'translate3d(0, -3.5%, 0)',
        },
        {
          clipPath: 'inset(0 0 72% 50%)',
          transform: 'translate3d(12%, -3.5%, 0)',
        },
        { clipPath: 'inset(28% 0 0 0)' },
      ],
    },
  },
  hero_female: {
    gloves: {
      legendary: [
        {
          clipPath: 'inset(0 50% 0 0)',
          transform: 'translate3d(8%, -2%, 0) scale3d(.9, .9, 1)',
          transformOrigin: '28% 45%',
        },
        {
          clipPath: 'inset(0 0 0 50%)',
          transform: 'translate3d(0, -9%, 0) scale3d(.9, .9, 1)',
          transformOrigin: '75% 50%',
        },
      ],
    },
  },
};

function layerStyleFor(characterId, slot, rarity) {
  return {
    zIndex: LAYER_Z_INDEX[slot],
    ...ORIGINAL_LAYER_STYLE[characterId]?.[slot]?.[rarity],
  };
}

function layerPieceStylesFor(characterId, slot, rarity) {
  const pieces = ORIGINAL_LAYER_PIECES[characterId]?.[slot]?.[rarity];
  if (!pieces) return [layerStyleFor(characterId, slot, rarity)];
  return pieces.map((piece) => ({ zIndex: LAYER_Z_INDEX[slot], ...piece }));
}

export default function HeroLoadoutLayers({ characterId, equipmentItems }) {
  const equippedBySlot = new Map(equipmentItems);

  return (
    <div className={`hero-loadout-layers hero-loadout-layers-${characterId}`} aria-label="현재 장착 장비 외형">
      {HERO_LOADOUT_LAYER_ORDER.map((slot) => {
        const item = equippedBySlot.get(slot);
        if (!item) return null;

        const src = heroLoadoutArtFor(characterId, slot, item.rarity);
        if (!src) return null;

        return layerPieceStylesFor(characterId, slot, item.rarity || 'common').map((pieceStyle, pieceIndex) => (
          <HeroCharacterArt
            key={`${slot}-${item.id}-${item.rarity || 'common'}-${pieceIndex}`}
            className={`hero-loadout-layer hero-loadout-layer-${slot} hero-loadout-layer-grade-${item.rarity || 'common'}`}
            src={src}
            alt=""
            style={pieceStyle}
          />
        ));
      })}
    </div>
  );
}
