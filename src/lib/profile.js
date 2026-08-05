export const PROFILE_SLOTS = [
  ['base', '프로필 사진'],
];

const profile = (id, slot, name, emoji, price, value = null) => ({
  id,
  slot,
  name,
  emoji,
  value: value || emoji,
  price,
});

// 예전 조합형 프로필은 이미 구매한 학생의 환불·소유 데이터를 잃지 않도록
// 카탈로그 맵에만 남겨 둡니다. 화면에는 새 단일 프로필 사진만 보여 줍니다.
const LEGACY_PROFILE_ITEMS = [
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

export const PROFILE_ITEMS = [
  profile('profile_photo_rabbit', 'base', '토끼 사진', '🐰', 70),
  profile('profile_photo_cat', 'base', '고양이 사진', '🐱', 80),
  profile('profile_photo_dog', 'base', '강아지 사진', '🐶', 80),
  profile('profile_photo_panda', 'base', '판다 사진', '🐼', 100),
  profile('profile_photo_fox', 'base', '여우 사진', '🦊', 100),
  profile('profile_photo_frog', 'base', '개구리 사진', '🐸', 90),
  profile('profile_photo_pig', 'base', '돼지 사진', '🐷', 90),
  profile('profile_photo_bear', 'base', '곰 사진', '🐻', 100),
  profile('profile_photo_zebra', 'base', '얼룩말 사진', '🦓', 110),
  profile('profile_photo_penguin', 'base', '펭귄 사진', '🐧', 90),
  profile('profile_photo_tiger', 'base', '호랑이 사진', '🐯', 120),
  profile('profile_photo_lion', 'base', '사자 사진', '🦁', 130),
  profile('profile_photo_monkey', 'base', '원숭이 사진', '🐵', 100),
  profile('profile_photo_koala', 'base', '코알라 사진', '🐨', 100),
  profile('profile_photo_unicorn', 'base', '유니콘 사진', '🦄', 150),
  profile('profile_photo_dragon', 'base', '용 사진', '🐲', 180),
  profile('profile_photo_octopus', 'base', '문어 사진', '🐙', 100),
  profile('profile_photo_whale', 'base', '고래 사진', '🐳', 110),
  profile('profile_photo_bee', 'base', '꿀벌 사진', '🐝', 90),
  profile('profile_photo_butterfly', 'base', '나비 사진', '🦋', 100),
  profile('profile_photo_star', 'base', '반짝 별', '⭐', 70),
  profile('profile_photo_rainbow', 'base', '무지개', '🌈', 80),
  profile('profile_photo_heart', 'base', '하트', '💖', 70),
  profile('profile_photo_rocket', 'base', '로켓', '🚀', 120),
];

export const PROFILE_ITEM_MAP = Object.fromEntries(
  [...LEGACY_PROFILE_ITEMS, ...PROFILE_ITEMS].map((item) => [item.id, item]),
);

export function normalizeProfileOwned(raw) {
  return Array.isArray(raw) ? [...new Set(raw.filter((id) => PROFILE_ITEM_MAP[id]))] : [];
}
