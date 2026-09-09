import HeroCharacterArt from './HeroCharacterArt.jsx';
import { HERO_LOADOUT_LAYER_ORDER, heroLoadoutArtFor } from '../lib/heroLoadoutArt';
import { HERO_ART_ANCHORS, HERO_ARM_OCCLUSION } from '../lib/heroArtAnchors';

const LAYER_Z_INDEX = {
  shoes: 1,
  armor: 2,
  weapon: 4,
  gloves: 5,
  accessory: 6,
  helmet: 7,
};

// Legacy card-space adjustments retained only for uncalibrated assets.
// Precise image-space landmarks live in heroArtAnchors.js and take precedence.
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
  },
  hero_female: {
    helmet: {
      rare: { transform: 'translate3d(0, -3%, 0)' },
    },
    shoes: {
      common: { transform: 'translate3d(-1.2%, 22.7%, 0) scale3d(.56, .34, 1)', transformOrigin: '50.3% 65.2%' },
      legendary: { transform: 'translate3d(2.5%, 9.3%, 0) scale3d(.92, .38, 1)', transformOrigin: '46.6% 78.5%' },
      transcendent: { transform: 'translate3d(2.2%, 9.8%, 0) scale3d(.87, .4, 1)', transformOrigin: '47% 78.1%' },
    },
  },
};

// 양쪽 장갑이나 얼굴/몸 장식이 한 PNG에 함께 생성된 경우, 한 번에
// 움직이면 한쪽만 맞습니다. 필요한 영역을 두 장으로 나눠 각 앵커에 붙입니다.
const ORIGINAL_LAYER_PIECES = {
  hero_male: {
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

export default function HeroLoadoutLayers({ characterId, equipmentItems, baseArt }) {
  const equippedBySlot = new Map(equipmentItems);

  return (
    <div className={`hero-loadout-layers hero-loadout-layers-${characterId}`} aria-label="현재 장착 장비 외형">
      {baseArt && (HERO_ARM_OCCLUSION[characterId]?.[equippedBySlot.get('armor')?.rarity] || []).map((clipPath, index) => (
        <div key={`arm-${index}`} className="hero-loadout-image-plane" style={{ zIndex: 3 }}>
          <HeroCharacterArt src={baseArt} className="hero-loadout-layer hero-loadout-arm" style={{ clipPath, filter: 'none' }} />
        </div>
      ))}
      {HERO_LOADOUT_LAYER_ORDER.map((slot) => {
        const item = equippedBySlot.get(slot);
        if (!item) return null;

        const src = heroLoadoutArtFor(characterId, slot, item.rarity);
        if (!src) return null;

        const calibrated = HERO_ART_ANCHORS[characterId]?.[slot]?.[item.rarity];
        if (calibrated) return calibrated.map((style, index) => (
          <div key={`${slot}-${item.id}-${index}`} className={`hero-loadout-image-plane hero-piece-${slot}-${index}`} style={{ zIndex: LAYER_Z_INDEX[slot] }}>
            <HeroCharacterArt src={src} className={`hero-loadout-layer hero-loadout-layer-${slot} hero-loadout-layer-grade-${item.rarity || 'common'}`} style={style} />
          </div>
        ));

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
