/* =====================================================================
   3D 캐릭터 — 28종. 모두 상점에서 구입해야 쓸 수 있어요(무료 없음).
   ear: 귀/머리 모양, extra: 특징(갈기·등껍질 등), group: 상점 분류
   ===================================================================== */
export const SPECIES = {
  // ── 숲속 친구들 ──
  '🐰': { name: '토끼', body: '#ffffff', belly: '#ffe4ec', ear: 'long', earIn: '#ffb3c8', price: 60, group: 'land' },
  '🐻': { name: '곰', body: '#b07d51', belly: '#eed3ae', ear: 'round', earIn: '#8a5a3b', price: 60, group: 'land' },
  '🐱': { name: '고양이', body: '#f8b26a', belly: '#fff1dc', ear: 'pointy', earIn: '#fddcb2', price: 60, group: 'land' },
  '🐶': { name: '강아지', body: '#e8d3b0', belly: '#fff8ea', ear: 'floppy', earIn: '#c9a97e', price: 60, group: 'land' },
  '🐹': { name: '햄스터', body: '#f5d7a1', belly: '#fffaf0', ear: 'small', earIn: '#e0b088', price: 70, group: 'land' },
  '🐸': { name: '개구리', body: '#4ade80', belly: '#d9f99d', ear: 'top', earIn: '#166534', price: 60, group: 'land' },
  '🐷': { name: '돼지', body: '#f9a8d4', belly: '#fce7f3', ear: 'pointy', earIn: '#f472b6', pig: true, price: 60, group: 'land' },
  '🦊': { name: '여우', body: '#f8813c', belly: '#fff7ed', ear: 'pointy', earIn: '#ffffff', price: 80, group: 'land' },
  '🐨': { name: '코알라', body: '#9ca3af', belly: '#e5e7eb', ear: 'biground', earIn: '#d1d5db', price: 80, group: 'land' },
  '🐵': { name: '원숭이', body: '#a97142', belly: '#f0d6b8', ear: 'biground', earIn: '#f0d6b8', price: 80, group: 'land' },
  '🦝': { name: '너구리', body: '#8f9bb3', belly: '#e8ecf5', ear: 'pointy', earIn: '#5c6680', mask: true, price: 90, group: 'land' },
  '🐺': { name: '늑대', body: '#7c8798', belly: '#e2e8f0', ear: 'pointy', earIn: '#4b5563', price: 100, group: 'land' },
  '🐼': { name: '판다', body: '#ffffff', belly: '#ffffff', ear: 'round', earIn: '#26262b', panda: true, price: 100, group: 'land' },
  '🐯': { name: '호랑이', body: '#fb923c', belly: '#fff7ed', ear: 'round', earIn: '#fdba74', stripes: true, price: 100, group: 'land' },
  '🦥': { name: '나무늘보', body: '#b9a184', belly: '#e8dcc8', ear: 'small', earIn: '#8a7660', price: 110, group: 'land' },
  '🦁': { name: '사자', body: '#f0b45e', belly: '#fdf0d5', ear: 'round', earIn: '#c98b3a', extra: 'mane', price: 120, group: 'land' },
  '🦌': { name: '사슴', body: '#c98b5e', belly: '#f5e0cd', ear: 'pointy', earIn: '#a86f45', extra: 'antler', price: 120, group: 'land' },
  '🦓': { name: '얼룩말', body: '#f8fafc', belly: '#ffffff', ear: 'round', earIn: '#26262b', stripes: true, price: 130, group: 'land' },

  // ── 바다 친구들 ──
  '🐧': { name: '펭귄', body: '#2f3b52', belly: '#ffffff', ear: 'beak', earIn: '#fbbf24', price: 120, group: 'sea' },
  '🐢': { name: '바다거북', body: '#5cb85c', belly: '#d9f99d', ear: 'small', earIn: '#3d8b3d', extra: 'shell', price: 130, group: 'sea' },
  '🐙': { name: '문어', body: '#f472b6', belly: '#fce7f3', ear: 'none', earIn: '#ec4899', extra: 'tentacle', price: 140, group: 'sea' },
  '🦭': { name: '물범', body: '#a8b8c8', belly: '#e8eef5', ear: 'none', earIn: '#8fa0b3', extra: 'whisker', price: 140, group: 'sea' },
  '🐬': { name: '돌고래', body: '#7fc7e8', belly: '#e8f6fd', ear: 'fin', earIn: '#5aa8cc', price: 150, group: 'sea' },
  '🦈': { name: '상어', body: '#8fa3b8', belly: '#f1f5f9', ear: 'fin', earIn: '#5b6b7d', extra: 'teeth', price: 160, group: 'sea' },
  '🐳': { name: '고래', body: '#5b8fd6', belly: '#dbeafe', ear: 'fin', earIn: '#3d6fb5', extra: 'spout', price: 180, group: 'sea' },

  // ── 신비한 친구들 ──
  '🦎': { name: '도마뱀', body: '#84cc16', belly: '#ecfccb', ear: 'none', earIn: '#4d7c0f', extra: 'spike', price: 90, group: 'myth' },
  '🦄': { name: '유니콘', body: '#fdf2ff', belly: '#ffffff', ear: 'pointy', earIn: '#f0abfc', extra: 'horn', price: 200, group: 'myth' },
  '🐲': { name: '드래곤', body: '#34d399', belly: '#a7f3d0', ear: 'pointy', earIn: '#059669', extra: 'wing', price: 250, group: 'myth' },
};

// 여우원숭이(레무르)는 이모지 키가 없어 원숭이 계열로 별도 등록
SPECIES['🐒'] = {
  name: '여우원숭이', body: '#b8bcc4', belly: '#f1f5f9',
  ear: 'biground', earIn: '#4b5563', extra: 'ringtail', price: 150, group: 'land',
};

export const AVATAR_BASES = Object.keys(SPECIES);
export const SPECIES_GROUP = { land: '🌳 숲속 친구', sea: '🌊 바다 친구', myth: '✨ 신비한 친구' };

/** 캐릭터를 아직 하나도 안 샀을 때 보이는 기본 모습 (상점에는 없어요) */
export const DEFAULT_SPECIES = {
  name: '기본 캐릭터', body: '#cbd5e1', belly: '#f1f5f9', ear: 'round', earIn: '#94a3b8',
};
export const speciesOf = (base) => SPECIES[base] || DEFAULT_SPECIES;

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
  // 교실·조명
  deskpair: [2, 1], teacherdesk: [2, 1], chalkboard: [2, 1], locker: [2, 1],
  shoerack: [2, 1], noticeboard: [2, 1], screen: [2, 1], fluorescent: [2, 1],
  // 카페
  cafecounter: [2, 1], cafeshelf: [2, 1], cafesofa: [2, 1], cafeawning: [2, 1],
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

  // ---------- 🏫 교실 가구 ----------
  I('class_desk', 'class', 'schooldesk', '🪑', '학생 책상', 45, { a: '#e8d5b7' }),
  I('class_desk2', 'class', 'deskpair', '🪑', '짝꿍 책상 2개', 80, { a: '#e8d5b7' }),
  I('class_tdesk', 'class', 'teacherdesk', '🧑‍🏫', '선생님 책상', 110, { a: '#a16207' }),
  I('class_podium', 'class', 'podium', '🎤', '교탁', 70, { a: '#b5834f' }),
  I('class_board', 'class', 'chalkboard', '📗', '칠판', 130, { a: '#2f6b4f' }),
  I('class_whiteboard', 'class', 'chalkboard', '⬜', '화이트보드', 130, { a: '#f8fafc' }),
  I('class_locker', 'class', 'locker', '🗄️', '사물함', 120, { a: '#7dd3fc' }),
  I('class_shoerack', 'class', 'shoerack', '👟', '신발장', 90, { a: '#d6bd97' }),
  I('class_notice', 'class', 'noticeboard', '📌', '학급 게시판', 85, { a: '#c9a468' }),
  I('class_screen', 'class', 'screen', '📽️', '빔 스크린', 100, { a: '#f8fafc' }),
  I('class_projector', 'class', 'projector', '📽️', '프로젝터', 95, { a: '#94a3b8' }),
  I('class_clock', 'class', 'wallclock', '🕐', '교실 벽시계', 40, { a: '#f8fafc' }),
  I('class_flag', 'class', 'flagpole', '🇰🇷', '태극기 (깃대)', 50, { a: '#f8fafc' }),
  I('class_taegukgi', 'class', 'taegukgi', '🇰🇷', '태극기 (벽걸이)', 60, { a: '#8a5f36' }),
  I('class_water', 'class', 'waterdisp', '🚰', '정수기', 75, { a: '#e2e8f0' }),
  I('class_clean', 'class', 'cleanbox', '🧹', '청소도구함', 55, { a: '#9ca3af' }),
  I('class_recycle', 'class', 'recyclebin', '♻️', '분리수거함', 45, { a: '#22c55e' }),
  I('class_milk', 'class', 'milkbox', '🥛', '우유 상자', 30, { a: '#f1f5f9' }),
  I('class_library', 'class', 'bookshelf', '📚', '학급 문고', 80, { a: '#b45309' }),
  I('class_plant', 'class', 'plant_big', '🪴', '교실 화분', 45, { a: '#16a34a', b: '#92400e' }),
  I('class_piano', 'class', 'piano', '🎹', '교실 피아노', 180, { a: '#26262b' }),
  I('class_aquarium', 'class', 'aquarium', '🐠', '교실 어항', 70, { a: '#7dd3fc' }),
  I('class_medal', 'class', 'trophy', '🏆', '상장 진열장', 90, { a: '#a16207' }),

  // ---------- 💡 조명 (진짜로 빛이 나요) ----------
  I('light_fluor', 'light', 'fluorescent', '💡', '교실 형광등', 60, { a: '#ffffff' }),
  I('light_mood', 'light', 'moodlamp', '🕯️', '무드등', 55, { a: '#fbbf24' }),
  I('light_mood_pink', 'light', 'moodlamp', '🕯️', '핑크 무드등', 55, { a: '#f472b6' }),
  I('light_chandelier', 'light', 'chandelier', '✨', '샹들리에', 220, { a: '#fde047' }),
  I('light_neon', 'light', 'neon', '🌈', '네온사인', 130, { a: '#22d3ee' }),
  I('light_neon_pink', 'light', 'neon', '🌈', '핑크 네온', 130, { a: '#f472b6' }),
  I('light_star', 'light', 'starlight', '⭐', '별빛 조명', 90, { a: '#a5b4fc' }),
  I('light_xmas', 'light', 'xmastree', '🎄', '크리스마스 트리', 160, { a: '#22c55e' }),
  I('light_lantern', 'light', 'floorlantern', '🏮', '바닥 랜턴', 70, { a: '#fb923c' }),
  I('light_campfire', 'light', 'campfire', '🔥', '모닥불 조명', 80, { a: '#f97316' }),

  // ---------- 실내 추가 (인기 아이템) ----------
  I('room_bunkbed', 'room', 'bunkbed', '🛏️', '2층 침대', 170, { a: '#60a5fa' }),
  I('room_hammock', 'room', 'hammock', '🏝️', '해먹', 95, { a: '#fbbf24' }),
  I('room_swingchair', 'room', 'swingchair', '🪺', '행잉 의자', 130, { a: '#f8fafc' }),
  I('room_guitar', 'room', 'guitarstand', '🎸', '기타 스탠드', 90, { a: '#d97706' }),
  I('room_basketballrug', 'room', 'rug', '🏀', '농구 코트 러그', 60, { a: '#f59e0b' }),
  I('room_treadmill', 'room', 'treadmill', '🏃', '러닝머신', 160, { a: '#334155' }),
  I('room_vending', 'room', 'vending', '🥤', '자판기', 190, { a: '#ef4444' }),
  I('room_arcade', 'room', 'arcade', '🕹️', '오락기', 220, { a: '#7c3aed' }),
  I('room_camera', 'room', 'tripodcam', '📷', '삼각대 카메라', 85, { a: '#26262b' }),
  I('room_moon', 'room', 'moonlamp', '🌙', '달 조명', 100, { a: '#fef3c7' }),

  // ---------- 정원 추가 ----------
  I('garden_greenhouse', 'garden', 'greenhouse', '🏡', '유리 온실', 210, { a: '#a7f3d0' }),
  I('garden_bridge', 'garden', 'gbridge', '🌉', '작은 다리', 95, { a: '#b5834f' }),
  I('garden_treehouse', 'garden', 'treehouse', '🌲', '트리하우스', 260, { a: '#8a5f36' }),
  I('garden_hopscotch', 'garden', 'hopscotch', '🔢', '땅따먹기 판', 40, { a: '#f8fafc' }),
  I('garden_basketball', 'garden', 'hoop', '🏀', '야외 농구대', 90, { a: '#ef4444' }),
  I('garden_stage', 'garden', 'ministage', '🎤', '미니 무대', 180, { a: '#a78bfa' }),

  // ---------- ☕ 카페 ----------
  I('cafe_counter', 'cafe', 'cafecounter', '🧾', '카페 카운터', 160, { a: '#8a5a3b' }),
  I('cafe_machine', 'cafe', 'espresso', '☕', '에스프레소 머신', 140, { a: '#cbd5e1' }),
  I('cafe_grinder', 'cafe', 'grinder', '⚙️', '원두 그라인더', 80, { a: '#ef4444' }),
  I('cafe_shelf', 'cafe', 'cafeshelf', '🫙', '원두 진열장', 110, { a: '#a16207' }),
  I('cafe_cake', 'cafe', 'cakecase', '🍰', '케이크 진열대', 130, { a: '#f8fafc' }),
  I('cafe_table', 'cafe', 'cafetable', '🪑', '카페 테이블', 70, { a: '#b5834f' }),
  I('cafe_table_marble', 'cafe', 'cafetable', '🪑', '대리석 테이블', 90, { a: '#f1f5f9' }),
  ...vary('cafe_chair', 'cafe', 'cafechair', '💺', '카페 의자', 45, ['pink', 'mint', 'yellow']),
  I('cafe_sofa', 'cafe', 'cafesofa', '🛋️', '카페 소파석', 150, { a: '#8b5e3c' }),
  I('cafe_menu', 'cafe', 'menuboard', '📋', '메뉴판', 65, { a: '#26262b' }),
  I('cafe_barstool', 'cafe', 'barstool', '🪑', '바 의자', 40, { a: '#f59e0b' }),
  I('cafe_plantpot', 'cafe', 'cafeplant', '🌿', '카페 화분', 50, { a: '#22c55e' }),
  I('cafe_awning', 'cafe', 'cafeawning', '⛱️', '차양막', 120, { a: '#ef4444' }),
  I('cafe_sign', 'cafe', 'cafesign', '🪧', '카페 간판', 100, { a: '#7c4a21' }),
  I('cafe_fridge', 'cafe', 'drinkfridge', '🥤', '음료 냉장고', 135, { a: '#38bdf8' }),
  I('cafe_juicer', 'cafe', 'juicer', '🧃', '주스 기계', 95, { a: '#fb923c' }),
  I('cafe_cup', 'cafe', 'cupstack', '🥤', '컵 타워', 35, { a: '#f8fafc' }),
  I('cafe_board', 'cafe', 'standboard', '✍️', '입간판', 75, { a: '#26262b' }),
  I('cafe_speaker', 'cafe', 'speaker', '🔊', '음악 스피커', 85, { a: '#334155' }),
  I('cafe_tip', 'cafe', 'tipjar', '💰', '팁 항아리', 40, { a: '#fbbf24' }),

  // ---------- 🐾 애완동물 (돌아다녀요!) ----------
  I('pet_dog', 'pet', 'petDog', '🐕', '강아지', 120, { a: '#e8d3b0' }),
  I('pet_cat', 'pet', 'petCat', '🐈', '고양이', 120, { a: '#f8b26a' }),
  I('pet_hamster', 'pet', 'petHamster', '🐹', '햄스터', 80, { a: '#f5d7a1' }),
  I('pet_rabbit', 'pet', 'petRabbit', '🐇', '토끼', 100, { a: '#ffffff' }),
  I('pet_chick', 'pet', 'petChick', '🐤', '병아리', 60, { a: '#fde047' }),
  I('pet_parrot', 'pet', 'petParrot', '🦜', '앵무새', 140, { a: '#ef4444' }),
  I('pet_turtle', 'pet', 'petTurtle', '🐢', '거북이', 110, { a: '#5cb85c' }),
  I('pet_hedgehog', 'pet', 'petHedgehog', '🦔', '고슴도치', 130, { a: '#b98a5e' }),
  I('pet_squirrel', 'pet', 'petSquirrel', '🐿️', '다람쥐', 110, { a: '#c2703d' }),
  I('pet_penguin', 'pet', 'petPenguin', '🐧', '아기 펭귄', 150, { a: '#2f3b52' }),
  I('pet_butterfly', 'pet', 'petButterfly', '🦋', '나비', 70, { a: '#60a5fa' }),
  I('pet_ladybug', 'pet', 'petLadybug', '🐞', '무당벌레', 55, { a: '#ef4444' }),
  I('pet_fish', 'pet', 'petFish', '🐠', '금붕어', 90, { a: '#fb923c' }),
  I('pet_dragon', 'pet', 'petDragon', '🐲', '아기 드래곤', 300, { a: '#34d399' }),
  I('pet_ghost', 'pet', 'petGhost', '👻', '꼬마 유령', 200, { a: '#e0e7ff' }),

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

/* ===== 캐릭터도 상점에서 사는 아이템이에요 (무료 없음) ===== */
export const CHAR_ITEMS = Object.entries(SPECIES).map(([base, sp]) => ({
  id: `char_${base.codePointAt(0).toString(16)}`,
  slot: 'char',
  model: null,
  emoji: base,
  name: sp.name,
  price: sp.price,
  colors: {},
  base,                 // 구입 후 avatar.base 에 넣을 값
  group: sp.group,
}));
ITEMS.push(...CHAR_ITEMS);

/* ===== 👫 함께 다니는 친구 — 사면 내 공간을 자유롭게 돌아다녀요 ===== */
export const FRIEND_ITEMS = Object.entries(SPECIES).map(([base, sp]) => ({
  id: `friend_${base.codePointAt(0).toString(16)}`,
  slot: 'friend',
  model: null,
  emoji: base,
  name: `${sp.name} 친구`,
  price: Math.round(sp.price * 1.6),
  colors: {},
  base,
  group: sp.group,
}));
ITEMS.push(...FRIEND_ITEMS);

export const ITEM_MAP = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const CHAR_BY_BASE = Object.fromEntries(CHAR_ITEMS.map((i) => [i.base, i]));
export const PET_ITEMS = ITEMS.filter((i) => i.slot === 'pet');

/** 공간을 돌아다니는 것들(친구·애완동물) */
export const isCompanion = (slot) => slot === 'friend' || slot === 'pet';

export const SLOT_LABEL = {
  char: '캐릭터', friend: '친구', pet: '애완동물',
  hat: '모자', face: '얼굴', acc: '손 아이템',
  room: '가구·소품', garden: '정원', class: '교실', cafe: '카페', light: '조명',
  wall: '벽지', floor: '바닥',
};

export const GARDEN_FLOOR = ['#a5db7c', '#97d16d'];
export const CLASS_FLOOR = ['#d9b98f', '#d2b085'];
export const CAFE_FLOOR = ['#6b4a34', '#5d4030'];

/* ===== 💡 조명 스펙 — 이 모델들은 3D 공간에서 진짜로 빛을 냅니다 ===== */
export const LIGHT_SPEC = {
  fluorescent: { y: 2.5, i: 1.3, d: 8 },
  moodlamp: { y: 0.7, i: 0.9, d: 4 },
  chandelier: { y: 2.2, i: 1.7, d: 9 },
  neon: { y: 1.4, i: 1.1, d: 5 },
  starlight: { y: 1.7, i: 0.8, d: 5 },
  xmastree: { y: 0.9, i: 1.0, d: 4.5 },
  floorlantern: { y: 0.5, i: 0.8, d: 3.5 },
  campfire: { y: 0.4, i: 1.2, d: 4 },
};

/* ===== 🎁 아이템 세트 — 묶어서 사면 할인! ===== */
export const SETS = [
  {
    id: 'set_class_basic', name: '🏫 교실 기본 세트', off: 0.15,
    desc: '책상·교탁·칠판·사물함·벽시계로 교실의 기본을 한 번에!',
    items: ['class_desk2', 'class_tdesk', 'class_podium', 'class_board', 'class_locker', 'class_clock'],
  },
  {
    id: 'set_class_full', name: '🏫 교실 풀옵션 세트', off: 0.2,
    desc: '게시판·스크린·정수기·청소함·분리수거함까지 완벽하게!',
    items: ['class_notice', 'class_screen', 'class_projector', 'class_water', 'class_clean', 'class_recycle', 'class_shoerack'],
  },
  {
    id: 'set_light_basic', name: '💡 조명 세트', off: 0.15,
    desc: '형광등·무드등·별빛 조명으로 공간이 확 달라져요',
    items: ['light_fluor', 'light_mood', 'light_star', 'light_lantern'],
  },
  {
    id: 'set_light_party', name: '✨ 파티 조명 세트', off: 0.2,
    desc: '샹들리에·네온사인·크리스마스 트리로 화려하게!',
    items: ['light_chandelier', 'light_neon', 'light_neon_pink', 'light_xmas'],
  },
  {
    id: 'set_room_cozy', name: '🛋️ 아늑한 내 방 세트', off: 0.15,
    desc: '침대·소파·러그·책장·전등으로 포근한 방 완성',
    items: ['room_bed', 'room_sofa', 'room_rug_pink', 'room_books', 'room_lamp', 'room_bear'],
  },
  {
    id: 'set_garden_play', name: '🌳 신나는 놀이터 세트', off: 0.2,
    desc: '그네·미끄럼틀·시소·모래놀이터로 정원을 놀이터로!',
    items: ['garden_swing', 'garden_slide', 'garden_seesaw', 'garden_sandbox', 'garden_tree'],
  },
  {
    id: 'set_cafe_start', name: '☕ 카페 창업 세트', off: 0.2,
    desc: '카운터·머신·테이블·의자·메뉴판 — 오늘부터 나도 사장님!',
    items: ['cafe_counter', 'cafe_machine', 'cafe_table', 'cafe_chair_pink', 'cafe_menu', 'cafe_cup'],
  },
  {
    id: 'set_cafe_deluxe', name: '☕ 디저트 카페 세트', off: 0.2,
    desc: '케이크 진열대·음료 냉장고·소파석까지 갖춘 진짜 카페',
    items: ['cafe_cake', 'cafe_fridge', 'cafe_sofa', 'cafe_shelf', 'cafe_sign', 'cafe_speaker'],
  },
  {
    id: 'set_pet_friends', name: '🐾 첫 반려동물 세트', off: 0.15,
    desc: '강아지·고양이·햄스터가 내 공간을 함께 돌아다녀요!',
    items: ['pet_dog', 'pet_cat', 'pet_hamster', 'pet_chick'],
  },
];

/** 세트 가격 계산 — 이미 가진 아이템은 빼고 계산해요 */
export function setPrice(set, inventory = []) {
  const need = set.items.filter((id) => !inventory.includes(id) && ITEM_MAP[id]);
  const full = need.reduce((a, id) => a + ITEM_MAP[id].price, 0);
  return { need, full, price: Math.floor(full * (1 - set.off)), saved: full - Math.floor(full * (1 - set.off)) };
}

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
