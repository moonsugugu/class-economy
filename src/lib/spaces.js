// 기본 공간은 기존 문서 필드를 그대로 사용하고, 넓은 공간만 새 필드에 저장해요.
// 작은 공간 4개를 먼저 보여주고, 그 뒤에 넓은 공간 4개를 보여줘요.
export const SPACE_UNLOCK_PRICE = 1000;

export const SPACE_TABS = [
  { id: 'room', icon: '🛋️', label: '내 방', visitLabel: '방', mapField: 'room', baseId: 'room', wide: false },
  { id: 'garden', icon: '🌳', label: '정원', visitLabel: '정원', mapField: 'garden', baseId: 'garden', wide: false },
  { id: 'classroom', icon: '🏫', label: '교실', visitLabel: '교실', mapField: 'classroom', baseId: 'classroom', wide: false },
  { id: 'cafe', icon: '☕', label: '카페', visitLabel: '카페', mapField: 'cafe', baseId: 'cafe', wide: false },
  { id: 'largeRoom', icon: '🏠', label: '넓은 내 방', visitLabel: '넓은 방', mapField: 'largeRoom', baseId: 'room', wide: true, unlockPrice: SPACE_UNLOCK_PRICE },
  { id: 'largeGarden', icon: '🌿', label: '넓은 정원', visitLabel: '넓은 정원', mapField: 'largeGarden', baseId: 'garden', wide: true, unlockPrice: SPACE_UNLOCK_PRICE },
  { id: 'largeClassroom', icon: '🏛️', label: '넓은 교실', visitLabel: '넓은 교실', mapField: 'largeClassroom', baseId: 'classroom', wide: true, unlockPrice: SPACE_UNLOCK_PRICE },
  { id: 'largeCafe', icon: '🍰', label: '넓은 카페', visitLabel: '넓은 카페', mapField: 'largeCafe', baseId: 'cafe', wide: true, unlockPrice: SPACE_UNLOCK_PRICE },
];

const SPACE_MAP = Object.fromEntries(SPACE_TABS.map((space) => [space.id, space]));

export function spaceConfig(id) {
  return SPACE_MAP[id] || SPACE_MAP.room;
}

export function isWideSpace(id) {
  return Boolean(spaceConfig(id).wide);
}

export function isSpaceUnlocked(student, id) {
  const space = spaceConfig(id);
  return !space.wide || student?.spaceUnlocks?.[space.id] === true;
}

export function spaceMapField(id) {
  return spaceConfig(id).mapField;
}

export function spaceGuestbookLabel(id) {
  return `${spaceConfig(id).visitLabel}에서`;
}
