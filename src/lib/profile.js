export const PROFILE_SLOTS = [
  ['base', '캐릭터'],
  ['hat', '모자'],
  ['face', '표정'],
  ['acc', '장식'],
];

const profile = (id, slot, name, emoji, price, value = null) => ({
  id,
  slot,
  name,
  emoji,
  value: value || emoji,
  price,
});

export const PROFILE_ITEMS = [
  profile('profile_base_rabbit', 'base', '솜사탕 토끼', '🐰', 80),
  profile('profile_base_cat', 'base', '별눈 고양이', '🐱', 90),
  profile('profile_base_dog', 'base', '말랑 강아지', '🐶', 90),
  profile('profile_base_panda', 'base', '밤하늘 판다', '🐼', 120),
  profile('profile_base_dragon', 'base', '꼬마 드래곤', '🐲', 180),
  profile('profile_hat_crown', 'hat', '반짝 왕관', '👑', 130),
  profile('profile_hat_wizard', 'hat', '별빛 마법사 모자', '🧙', 150),
  profile('profile_hat_party', 'hat', '파티 모자', '🥳', 100),
  profile('profile_hat_flower', 'hat', '꽃 왕관', '🌸', 110),
  profile('profile_hat_helmet', 'hat', '미니 헬멧', '⛑️', 140),
  profile('profile_face_sunglasses', 'face', '선글라스', '😎', 100),
  profile('profile_face_heart', 'face', '하트 눈', '😍', 120),
  profile('profile_face_star', 'face', '별 눈', '🤩', 140),
  profile('profile_face_sleepy', 'face', '졸린 표정', '😴', 80),
  profile('profile_face_cool', 'face', '멋진 표정', '😏', 110),
  profile('profile_acc_rainbow', 'acc', '무지개 리본', '🌈', 120),
  profile('profile_acc_sparkle', 'acc', '반짝 별', '✨', 100),
  profile('profile_acc_butterfly', 'acc', '나비 친구', '🦋', 130),
  profile('profile_acc_bubble', 'acc', '비눗방울', '🫧', 90),
  profile('profile_acc_fire', 'acc', '불꽃 오라', '🔥', 180),
];

export const PROFILE_ITEM_MAP = Object.fromEntries(PROFILE_ITEMS.map((item) => [item.id, item]));

export function normalizeProfileOwned(raw) {
  return Array.isArray(raw) ? [...new Set(raw.filter((id) => PROFILE_ITEM_MAP[id]))] : [];
}
