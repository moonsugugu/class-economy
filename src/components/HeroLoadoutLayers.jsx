import { HERO_LOADOUT_LAYER_ORDER, heroLoadoutArtFor } from '../lib/heroLoadoutArt';

// 부위별 쌓는 순서: 장갑이 무기 손잡이를 감싸고, 투구가 맨 위에 옵니다.
const LAYER_Z_INDEX = {
  shoes: 1,
  armor: 2,
  weapon: 4,
  gloves: 5,
  accessory: 6,
  helmet: 7,
};

// 기본 캐릭터 위에 "현재 장착한 부위의 등급" 레이어만 겹칩니다.
// 보유 중인 최고 등급이 아니라 슬롯마다 장착한 아이템의 등급을 그대로 씁니다.
// 모든 레이어가 기본 캐릭터와 같은 화면 크기라서 위치 보정·잘라 붙이기가 필요 없어요.
export default function HeroLoadoutLayers({ characterId, equipmentItems }) {
  const equippedBySlot = new Map(equipmentItems);

  return HERO_LOADOUT_LAYER_ORDER.map((slot) => {
    const item = equippedBySlot.get(slot);
    const src = item ? heroLoadoutArtFor(characterId, slot, item.rarity) : null;
    if (!src) return null;
    const rarity = item.rarity || 'common';
    return (
      <img
        key={`${slot}-${item.id}`}
        className={`hero-figure-layer hero-figure-layer-${slot} hero-figure-grade-${rarity}`}
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        style={{ zIndex: LAYER_Z_INDEX[slot] }}
      />
    );
  });
}
