// ===== 아바타 기본 캐릭터 (무료, 언제든 변경) =====
export const AVATAR_BASES = ['🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🐯', '🐸', '🐷', '🐨'];

// 3D 캐릭터 생김새 정의
export const SPECIES = {
  '🐰': { name: '토끼', body: '#ffffff', belly: '#ffe4ec', ear: 'long', earIn: '#ffb3c8' },
  '🐻': { name: '곰', body: '#b07d51', belly: '#eed3ae', ear: 'round', earIn: '#8a5a3b' },
  '🐱': { name: '고양이', body: '#f8b26a', belly: '#fff1dc', ear: 'pointy', earIn: '#fddcb2' },
  '🐶': { name: '강아지', body: '#e8d3b0', belly: '#fff8ea', ear: 'floppy', earIn: '#c9a97e' },
  '🦊': { name: '여우', body: '#f8813c', belly: '#fff7ed', ear: 'pointy', earIn: '#ffffff' },
  '🐼': { name: '판다', body: '#ffffff', belly: '#ffffff', ear: 'round', earIn: '#26262b', panda: true },
  '🐯': { name: '호랑이', body: '#fb923c', belly: '#fff7ed', ear: 'round', earIn: '#fdba74' },
  '🐸': { name: '개구리', body: '#4ade80', belly: '#d9f99d', ear: 'top', earIn: '#166534' },
  '🐷': { name: '돼지', body: '#f9a8d4', belly: '#fce7f3', ear: 'pointy', earIn: '#f472b6', pig: true },
  '🐨': { name: '코알라', body: '#9ca3af', belly: '#e5e7eb', ear: 'biground', earIn: '#d1d5db' },
};

// ===== 마이룸 격자 =====
export const ROOM_COLS = 8;
export const ROOM_ROWS = 6;

// 가구 바닥 면적 [가로칸, 세로칸] (미지정 = 1x1)
export const FOOTPRINT = {
  bed: [1, 2], sofa: [2, 1], tv: [2, 1], piano: [2, 1],
  bathtub: [1, 2], rug: [2, 2], desk: [2, 1], drums: [2, 1],
  kitchenset: [2, 1],
  // 정원
  pond: [2, 2], pool: [2, 2], swingset: [2, 1], slide: [1, 2],
  picnic: [2, 1], tent: [2, 2], vegpatch: [2, 1], bigtree: [2, 2], gtrampoline: [2, 2],
};

// ===== 아이템 카탈로그 =====
// slot: hat(모자) face(얼굴) acc(손 아이템) room(가구·소품) wall(벽지) floor(바닥)
// model: 3D 모델 이름, colors: {a: 주색, b: 보조색}
const I = (id, slot, model, emoji, name, price, colors = {}) => ({ id, slot, model, emoji, name, price, colors });

const WAYS = {
  pink: ['핑크', '#f472b6'], blue: ['하늘', '#60a5fa'], mint: ['민트', '#34d399'],
  yellow: ['노랑', '#facc15'], purple: ['보라', '#a78bfa'], red: ['빨강', '#ef4444'],
};
const vary = (idBase, slot, model, emoji, name, price, ways) =>
  ways.map((w) => I(`${idBase}_${w}`, slot, model, emoji, `${WAYS[w][0]} ${name}`, price, { a: WAYS[w][1] }));

export const ITEMS = [
  // ---------- 모자 ----------
  I('hat_top', 'hat', 'tophat', '🎩', '신사 모자', 40, { a: '#26262b', b: '#ef4444' }),
  I('hat_crown', 'hat', 'crown', '👑', '왕관', 150, { a: '#fbbf24', b: '#ef4444' }),
  I('hat_cap', 'hat', 'cap', '🧢', '야구 모자', 25, { a: '#3b82f6' }),
  ...vary('hat_cap', 'hat', 'cap', '🧢', '야구 모자', 25, ['red', 'mint']),
  I('hat_ribbon', 'hat', 'ribbon', '🎀', '리본', 20, { a: '#f472b6' }),
  I('hat_ribbon_blue', 'hat', 'ribbon', '🎀', '하늘 리본', 20, { a: '#60a5fa' }),
  I('hat_party', 'hat', 'party', '🥳', '파티 모자', 35, { a: '#f472b6', b: '#facc15' }),
  I('hat_party_blue', 'hat', 'party', '🥳', '파티 모자(파랑)', 35, { a: '#60a5fa', b: '#34d399' }),
  I('hat_wizard', 'hat', 'wizard', '🧙', '마법사 모자', 90, { a: '#7c3aed', b: '#fbbf24' }),
  I('hat_halo', 'hat', 'halo', '😇', '천사 링', 120, { a: '#fde047' }),
  ...vary('hat_beanie', 'hat', 'beanie', '🧶', '털모자', 30, ['pink', 'blue', 'mint']),
  I('hat_headphone', 'hat', 'headphone', '🎧', '헤드폰', 70, { a: '#ef4444' }),
  I('hat_chef', 'hat', 'chef', '👨‍🍳', '요리사 모자', 45, { a: '#ffffff' }),
  I('hat_santa', 'hat', 'santa', '🎅', '산타 모자', 60, { a: '#ef4444' }),
  I('hat_flower', 'hat', 'flower', '🌸', '꽃 머리핀', 35, { a: '#f9a8d4', b: '#fde047' }),
  I('hat_sprout', 'hat', 'sprout', '🌱', '새싹 머리핀', 25, { a: '#4ade80' }),

  // ---------- 얼굴 ----------
  I('face_sun', 'face', 'sunglasses', '🕶️', '선글라스', 30, { a: '#26262b' }),
  I('face_glasses', 'face', 'glasses', '👓', '동그란 안경', 20, { a: '#78350f' }),
  I('face_glasses_blue', 'face', 'glasses', '👓', '파란 안경', 20, { a: '#2563eb' }),
  I('face_goggle', 'face', 'goggles', '🥽', '물안경', 25, { a: '#38bdf8' }),
  I('face_heart', 'face', 'heartglasses', '😍', '하트 안경', 55, { a: '#f43f5e' }),
  I('face_star', 'face', 'starglasses', '🤩', '스타 안경', 55, { a: '#fbbf24' }),

  // ---------- 손 아이템 ----------
  I('acc_balloon', 'acc', 'balloon', '🎈', '빨강 풍선', 15, { a: '#ef4444' }),
  I('acc_balloon_blue', 'acc', 'balloon', '🎈', '하늘 풍선', 15, { a: '#60a5fa' }),
  I('acc_balloon_pink', 'acc', 'balloon', '🎈', '핑크 풍선', 15, { a: '#f472b6' }),
  I('acc_guitar', 'acc', 'guitar', '🎸', '기타', 80, { a: '#d97706', b: '#78350f' }),
  I('acc_soccer', 'acc', 'soccer', '⚽', '축구공', 30, { a: '#ffffff' }),
  I('acc_paint', 'acc', 'palette', '🎨', '물감 팔레트', 30, { a: '#d6a05c' }),
  I('acc_wand', 'acc', 'wand', '🪄', '마법 지팡이', 70, { a: '#7c3aed', b: '#fde047' }),
  I('acc_icecream', 'acc', 'icecream', '🍦', '아이스크림', 20, { a: '#fbcfe8' }),
  I('acc_flag', 'acc', 'flag', '🚩', '깃발', 25, { a: '#ef4444' }),
  I('acc_lollipop', 'acc', 'lollipop', '🍭', '막대사탕', 15, { a: '#f472b6' }),
  I('acc_bear', 'acc', 'minibear', '🧸', '미니 곰인형', 40, { a: '#d6a05c' }),

  // ---------- 가구: 침실 ----------
  I('room_bed', 'room', 'bed', '🛏️', '침대', 90, { a: '#f472b6' }),
  ...vary('room_bed', 'room', 'bed', '🛏️', '침대', 90, ['blue', 'mint', 'purple', 'yellow']),
  I('room_wardrobe', 'room', 'wardrobe', '🚪', '옷장', 80, { a: '#a16207', b: '#854d0e' }),
  I('room_bear', 'room', 'teddy', '🧸', '곰인형', 35, { a: '#c08a4e' }),
  I('room_bear_pink', 'room', 'teddy', '🧸', '핑크 토끼인형', 35, { a: '#f9a8d4' }),
  ...vary('room_rug', 'room', 'rug', '🟪', '러그', 40, ['pink', 'blue', 'mint', 'yellow']),

  // ---------- 가구: 거실 ----------
  I('room_sofa', 'room', 'sofa', '🛋️', '소파', 85, { a: '#f59e0b' }),
  ...vary('room_sofa', 'room', 'sofa', '🛋️', '소파', 85, ['pink', 'blue', 'mint']),
  ...vary('room_armchair', 'room', 'armchair', '💺', '1인 소파', 50, ['pink', 'blue', 'purple']),
  I('room_table', 'room', 'table', '🪵', '나무 탁자', 40, { a: '#b45309' }),
  I('room_roundtable', 'room', 'roundtable', '⚪', '둥근 탁자', 45, { a: '#f8fafc' }),
  I('room_chair', 'room', 'chair', '🪑', '의자', 25, { a: '#b45309' }),
  ...vary('room_chair', 'room', 'chair', '🪑', '의자', 25, ['pink', 'blue']),
  ...vary('room_stool', 'room', 'stool', '🍄', '버섯 의자', 20, ['red', 'pink']),
  I('room_tv', 'room', 'tv', '📺', '텔레비전', 110, { a: '#26262b' }),
  I('room_fireplace', 'room', 'fireplace', '🔥', '벽난로', 160, { a: '#b91c1c', b: '#7f1d1d' }),
  I('room_clock', 'room', 'clockG', '🕰️', '괘종시계', 55, { a: '#92400e' }),

  // ---------- 가구: 공부방 ----------
  I('room_books', 'room', 'bookshelf', '📚', '책장', 50, { a: '#a16207' }),
  I('room_books_white', 'room', 'bookshelf', '📚', '하얀 책장', 50, { a: '#f1f5f9' }),
  I('room_pc', 'room', 'computer', '🖥️', '컴퓨터 책상', 130, { a: '#94a3b8', b: '#b45309' }),
  I('room_lamp', 'room', 'lamp', '💡', '스탠드 전등', 20, { a: '#fde047', b: '#78350f' }),
  I('room_lamp_pink', 'room', 'lamp', '💡', '핑크 전등', 20, { a: '#f9a8d4', b: '#9d174d' }),
  I('room_easel', 'room', 'easel', '🖼️', '그림 이젤', 35, { a: '#4ade80' }),
  I('room_pic', 'room', 'easel', '🖼️', '명화 이젤', 35, { a: '#60a5fa' }),

  // ---------- 가전·놀이 ----------
  I('room_game', 'room', 'console', '🎮', '게임기', 120, { a: '#4f46e5' }),
  I('room_piano', 'room', 'piano', '🎹', '피아노', 180, { a: '#26262b' }),
  I('room_piano_white', 'room', 'piano', '🎹', '하얀 피아노', 200, { a: '#f8fafc' }),
  I('room_fridge', 'room', 'fridge', '🧊', '냉장고', 100, { a: '#e2e8f0' }),
  I('room_fridge_mint', 'room', 'fridge', '🧊', '민트 냉장고', 100, { a: '#5eead4' }),
  I('room_drums', 'room', 'drums', '🥁', '드럼 세트', 150, { a: '#ef4444' }),
  I('room_toybox', 'room', 'toybox', '🧰', '장난감 상자', 45, { a: '#f59e0b', b: '#3b82f6' }),
  I('room_rocket', 'room', 'rocket', '🚀', '로켓 장난감', 95, { a: '#e2e8f0', b: '#ef4444' }),
  I('room_hoop', 'room', 'hoop', '🏀', '농구 골대', 85, { a: '#ef4444' }),
  I('room_fish', 'room', 'aquarium', '🐠', '어항', 70, { a: '#7dd3fc' }),
  I('room_bathtub', 'room', 'bathtub', '🛁', '욕조', 120, { a: '#f8fafc' }),
  I('room_fountain', 'room', 'fountain', '⛲', '미니 분수', 250, { a: '#cbd5e1' }),

  // ---------- 소품·식물·음식 ----------
  I('room_plant', 'room', 'plant', '🪴', '화분', 20, { a: '#22c55e', b: '#b45309' }),
  I('room_plant_big', 'room', 'plant_big', '🌳', '큰 나무 화분', 45, { a: '#16a34a', b: '#92400e' }),
  I('room_flower_pink', 'room', 'flowerpot', '🌷', '튤립 화분', 18, { a: '#f472b6' }),
  I('room_flower_yellow', 'room', 'flowerpot', '🌻', '해바라기 화분', 18, { a: '#facc15' }),
  I('room_cake', 'room', 'cake', '🎂', '케이크 테이블', 30, { a: '#f9a8d4', b: '#fff' }),
  I('room_pizza', 'room', 'pizza', '🍕', '피자 테이블', 25, { a: '#fbbf24' }),

  // ---------- 실내 추가 가구 ----------
  I('room_mirror', 'room', 'mirror', '🪞', '전신 거울', 55, { a: '#fbbf24' }),
  I('room_dresser', 'room', 'dresser', '💄', '화장대', 95, { a: '#f9a8d4' }),
  I('room_kitchen', 'room', 'kitchenset', '🍳', '주방놀이 세트', 140, { a: '#fda4af' }),
  I('room_cattower', 'room', 'cattower', '🐈', '캣타워', 75, { a: '#e7d3b2' }),
  I('room_globe', 'room', 'globe', '🌍', '지구본', 40, { a: '#60a5fa' }),
  I('room_telescope', 'room', 'telescope', '🔭', '천체 망원경', 130, { a: '#334155' }),
  I('room_robot', 'room', 'robotoy', '🤖', '로봇 장난감', 85, { a: '#38bdf8' }),
  I('room_dollhouse', 'room', 'dollhouse', '🏠', '인형의 집', 110, { a: '#f9a8d4', b: '#e879f9' }),
  I('room_trophy', 'room', 'trophy', '🏆', '트로피 진열장', 70, { a: '#a16207' }),
  ...vary('room_beanbag', 'room', 'beanbag', '🫘', '빈백 쿠션', 35, ['pink', 'blue', 'mint']),

  // ---------- 정원: 나무·꽃 ----------
  I('garden_tree', 'garden', 'tree', '🌳', '초록 나무', 45, { a: '#4d9e3f' }),
  I('garden_tree_autumn', 'garden', 'tree', '🍁', '단풍나무', 50, { a: '#e8752e' }),
  I('garden_tree_cherry', 'garden', 'tree', '🌸', '벚나무', 60, { a: '#f6a8c9' }),
  I('garden_tree_apple', 'garden', 'treefruit', '🍎', '사과나무', 65, { a: '#4d9e3f' }),
  I('garden_tree_pine', 'garden', 'pine', '🌲', '소나무', 45, { a: '#2e7d4f' }),
  I('garden_tree_big', 'garden', 'bigtree', '🌳', '아름드리 나무', 150, { a: '#3e8a34' }),
  I('garden_bush', 'garden', 'bush', '🌿', '둥근 덤불', 18, { a: '#5cb85c' }),
  I('garden_bush_pink', 'garden', 'bushflower', '🌺', '꽃 덤불(분홍)', 25, { a: '#f472b6' }),
  I('garden_bush_yellow', 'garden', 'bushflower', '🌼', '꽃 덤불(노랑)', 25, { a: '#facc15' }),
  ...vary('garden_flowerbed', 'garden', 'flowerbed', '🌷', '꽃밭', 30, ['pink', 'yellow', 'purple', 'red']),
  I('garden_sunflower', 'garden', 'sunflower', '🌻', '해바라기', 22, { a: '#fbbf24' }),
  I('garden_veg', 'garden', 'vegpatch', '🥕', '텃밭', 55, { a: '#7a4a24' }),

  // ---------- 정원: 물·놀이 ----------
  I('garden_pond', 'garden', 'pond', '🦆', '오리 연못', 130, { a: '#7cc8e8' }),
  I('garden_pool', 'garden', 'pool', '🏊', '미니 수영장', 180, { a: '#5fc4e7' }),
  I('garden_swing', 'garden', 'swingset', '🛝', '그네', 110, { a: '#ef4444' }),
  I('garden_slide', 'garden', 'slide', '🛝', '미끄럼틀', 100, { a: '#f59e0b' }),
  I('garden_slide_blue', 'garden', 'slide', '🛝', '파랑 미끄럼틀', 100, { a: '#3b82f6' }),
  I('garden_seesaw', 'garden', 'seesaw', '⚖️', '시소', 80, { a: '#22c55e' }),
  I('garden_sandbox', 'garden', 'sandbox', '🏖️', '모래놀이터', 70, { a: '#f5d78e' }),
  I('garden_trampoline', 'garden', 'gtrampoline', '🤸', '트램펄린', 160, { a: '#3b82f6' }),

  // ---------- 정원: 쉼터·소품 ----------
  I('garden_bench', 'garden', 'gbench', '🪑', '정원 벤치', 40, { a: '#b5834f' }),
  I('garden_bench_white', 'garden', 'gbench', '🪑', '하얀 벤치', 40, { a: '#f1f5f9' }),
  I('garden_picnic', 'garden', 'picnic', '🧺', '피크닉 테이블', 75, { a: '#c08a4e' }),
  I('garden_parasol', 'garden', 'parasol', '⛱️', '파라솔 테이블', 90, { a: '#ef4444' }),
  I('garden_parasol_blue', 'garden', 'parasol', '⛱️', '파라솔(파랑)', 90, { a: '#3b82f6' }),
  I('garden_campfire', 'garden', 'campfire', '🔥', '모닥불', 60, { a: '#f97316' }),
  I('garden_tent', 'garden', 'tent', '⛺', '텐트', 140, { a: '#f59e0b' }),
  I('garden_tent_green', 'garden', 'tent', '⛺', '초록 텐트', 140, { a: '#22c55e' }),
  I('garden_doghouse', 'garden', 'doghouse', '🐶', '강아지 집', 65, { a: '#c08a4e', b: '#ef4444' }),
  I('garden_birdhouse', 'garden', 'birdhouse', '🐦', '새집', 35, { a: '#60a5fa' }),
  I('garden_mailbox', 'garden', 'mailbox', '📮', '우체통', 30, { a: '#ef4444' }),
  I('garden_mailbox_blue', 'garden', 'mailbox', '📮', '파랑 우체통', 30, { a: '#3b82f6' }),
  I('garden_well', 'garden', 'well', '🪣', '소원 우물', 120, { a: '#94a3b8' }),
  I('garden_grill', 'garden', 'grill', '🍖', '바비큐 그릴', 95, { a: '#26262b' }),
  I('garden_statue', 'garden', 'statue', '🗿', '토끼 동상', 200, { a: '#cbd5e1' }),
  I('garden_lantern', 'garden', 'glantern', '🏮', '정원 램프', 28, { a: '#fde047' }),
  I('garden_snowman', 'garden', 'snowman', '⛄', '눈사람', 55, { a: '#ffffff' }),
  I('garden_flamingo', 'garden', 'flamingo', '🦩', '플라밍고 장식', 45, { a: '#fb7185' }),
  I('garden_rock', 'garden', 'rock', '🪨', '바위', 15, { a: '#9ca3af' }),
  I('garden_stump', 'garden', 'stump', '🪵', '나무 그루터기', 15, { a: '#a16207' }),
  I('garden_windmill', 'garden', 'windmill', '🎡', '바람개비', 32, { a: '#f472b6', b: '#60a5fa' }),
  I('garden_scarecrow', 'garden', 'scarecrow', '🌾', '허수아비', 50, { a: '#d6a05c' }),

  // ---------- 벽지 ----------
  I('wall_cream', 'wall', null, '🏳️', '크림 벽지', 30, { a: '#fdf3df' }),
  I('wall_sky', 'wall', null, '🩵', '하늘 벽지', 30, { a: '#d3ecfb' }),
  I('wall_pink', 'wall', null, '🩷', '핑크 벽지', 30, { a: '#fbdaea' }),
  I('wall_mint', 'wall', null, '💚', '민트 벽지', 30, { a: '#d3f5e5' }),
  I('wall_lavender', 'wall', null, '💜', '라벤더 벽지', 30, { a: '#e8dcfb' }),
  I('wall_sunny', 'wall', null, '💛', '노랑 벽지', 30, { a: '#fdf0c2' }),
  I('wall_forest', 'wall', null, '🌲', '초록 벽지', 40, { a: '#bfe8c0' }),
  I('wall_night', 'wall', null, '🌌', '밤하늘 벽지', 60, { a: '#37427a' }),

  // ---------- 바닥 ----------
  I('floor_wood', 'floor', null, '🟫', '원목 바닥', 30, { a: '#d9b38c', b: '#cfa87e' }),
  I('floor_light', 'floor', null, '🟨', '밝은 마루', 30, { a: '#efd9b4', b: '#e6cda2' }),
  I('floor_marble', 'floor', null, '⬜', '대리석 바닥', 45, { a: '#f1f5f9', b: '#e2e8f0' }),
  I('floor_pinkcarpet', 'floor', null, '🩷', '핑크 카펫', 35, { a: '#fbcfe8', b: '#f9a8d4' }),
  I('floor_bluecarpet', 'floor', null, '🦋', '파랑 카펫', 35, { a: '#bfdbfe', b: '#93c5fd' }),
  I('floor_grass', 'floor', null, '🌿', '잔디 바닥', 40, { a: '#bbf7d0', b: '#86efac' }),
  I('floor_checker', 'floor', null, '🏁', '체크 바닥', 40, { a: '#f8fafc', b: '#94a3b8' }),
  I('floor_dark', 'floor', null, '⬛', '진한 원목', 40, { a: '#8f6b48', b: '#7d5c3c' }),
];

export const ITEM_MAP = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const SLOT_LABEL = {
  hat: '모자', face: '얼굴', acc: '손 아이템', room: '가구·소품', garden: '정원', wall: '벽지', floor: '바닥',
};

export const GARDEN_FLOOR = ['#a5db7c', '#97d16d'];

// 기본 벽/바닥 (스킨 미보유 시)
export const DEFAULT_WALL = '#fdf3df';
export const DEFAULT_FLOOR = ['#efd9b4', '#e6cda2'];

// ===== 방 배치 유틸 =====
// room 맵 값: 옛 형식(문자열 id) / 새 형식({id, rot}) 모두 지원
export function normalizeRoom(room = {}) {
  const out = {};
  for (const [k, v] of Object.entries(room)) {
    if (!v) continue;
    out[k] = typeof v === 'string' ? { id: v, rot: 0 } : v;
  }
  return out;
}

export function footprintOf(item, rot = 0) {
  const f = FOOTPRINT[item?.model] || [1, 1];
  return rot % 2 ? [f[1], f[0]] : f;
}

export function cellsOf(key, item, rot = 0) {
  const [r, c] = key.split('-').map(Number);
  const [w, d] = footprintOf(item, rot);
  const cells = [];
  for (let i = 0; i < d; i++) for (let j = 0; j < w; j++) cells.push(`${r + i}-${c + j}`);
  return cells;
}

export function occupancyOf(roomMap) {
  const occ = {};
  for (const [key, pl] of Object.entries(roomMap)) {
    const item = ITEM_MAP[pl.id];
    if (!item) continue;
    for (const c of cellsOf(key, item, pl.rot || 0)) occ[c] = key;
  }
  return occ;
}

export function canPlaceAt(roomMap, key, item, rot = 0, ignoreKey = null) {
  const [r, c] = key.split('-').map(Number);
  const [w, d] = footprintOf(item, rot);
  if (r < 0 || c < 0 || r + d > ROOM_ROWS || c + w > ROOM_COLS) return false;
  const occ = occupancyOf(roomMap);
  return cellsOf(key, item, rot).every((k) => !occ[k] || occ[k] === ignoreKey);
}
