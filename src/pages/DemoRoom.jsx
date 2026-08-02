import { useState } from 'react';
import { Link } from 'react-router-dom';
import RoomScene from '../three/RoomScene.jsx';

// 로그인 없이 3D 마이룸/정원을 구경하는 데모 (수업 시연용)
const DEMO_ROOM = {
  '0-0': { id: 'room_bed', rot: 0 },
  '0-2': { id: 'room_books', rot: 0 },
  '0-3': { id: 'room_pc', rot: 0 },
  '0-6': { id: 'room_fridge', rot: 0 },
  '1-6': { id: 'room_cake', rot: 0 },
  '2-0': { id: 'room_lamp', rot: 0 },
  '3-0': { id: 'room_sofa_blue', rot: 1 },
  '2-3': { id: 'room_rug_pink', rot: 0 },
  '5-1': { id: 'room_piano', rot: 0 },
  '2-6': { id: 'room_plant_big', rot: 0 },
  '5-5': { id: 'room_fish', rot: 0 },
  '4-7': { id: 'room_hoop', rot: 0 },
  '5-7': { id: 'room_bear', rot: 0 },
  '3-5': { id: 'room_dollhouse', rot: 0 },
  '0-5': { id: 'room_robot', rot: 0 },
};

const DEMO_GARDEN = {
  '0-0': { id: 'garden_tree_cherry', rot: 0 },
  '0-3': { id: 'garden_pond', rot: 0 },
  '0-6': { id: 'garden_tree_apple', rot: 0 },
  '2-0': { id: 'garden_swing', rot: 0 },
  '2-6': { id: 'garden_tent', rot: 0 },
  '3-3': { id: 'garden_campfire', rot: 0 },
  '4-0': { id: 'garden_flowerbed_pink', rot: 0 },
  '5-1': { id: 'garden_doghouse', rot: 0 },
  '4-5': { id: 'garden_picnic', rot: 0 },
  '5-4': { id: 'garden_sunflower', rot: 0 },
  '5-7': { id: 'garden_flamingo', rot: 0 },
  '4-4': { id: 'garden_mailbox', rot: 0 },
  '0-2': { id: 'garden_pine', rot: 0 },
  '2-4': { id: 'garden_well', rot: 0 },
};

// 칠판·게시판·시계는 교실 자체에 이미 있으니 책상·사물함 위주로
const DEMO_CLASS = {
  '1-3': { id: 'class_tdesk', rot: 0 },
  '1-1': { id: 'class_podium', rot: 0 },
  '3-0': { id: 'class_desk2', rot: 0 },
  '3-3': { id: 'class_desk2', rot: 0 },
  '3-6': { id: 'class_desk2', rot: 0 },
  '5-0': { id: 'class_desk2', rot: 0 },
  '5-3': { id: 'class_desk2', rot: 0 },
  '2-6': { id: 'class_locker', rot: 0 },
  '5-6': { id: 'class_water', rot: 0 },
  '4-5': { id: 'class_recycle', rot: 0 },
  '0-7': { id: 'class_flag', rot: 0 },
  '0-1': { id: 'class_board', rot: 0 },
  '0-5': { id: 'class_taegukgi', rot: 0 },
  '0-6': { id: 'class_clock', rot: 0 },
};

const DEMO_CAFE = {
  '0-0': { id: 'cafe_counter', rot: 0 },
  '0-2': { id: 'cafe_machine', rot: 0 },
  '0-3': { id: 'cafe_grinder', rot: 0 },
  '0-5': { id: 'cafe_shelf', rot: 0 },
  '1-0': { id: 'cafe_cake', rot: 0 },
  '2-1': { id: 'cafe_table', rot: 0 },
  '2-2': { id: 'cafe_chair_pink', rot: 0 },
  '3-1': { id: 'cafe_chair_mint', rot: 0 },
  '2-5': { id: 'cafe_table_marble', rot: 0 },
  '3-5': { id: 'cafe_chair_yellow', rot: 0 },
  '4-0': { id: 'cafe_sofa', rot: 0 },
  '4-4': { id: 'cafe_plantpot', rot: 0 },
  '5-2': { id: 'cafe_sign', rot: 0 },
  '5-6': { id: 'cafe_menu', rot: 0 },
  '1-7': { id: 'cafe_fridge', rot: 0 },
  '3-7': { id: 'cafe_speaker', rot: 0 },
  '5-4': { id: 'cafe_board', rot: 0 },
};

// 데모에 함께 등장하는 친구·애완동물
const DEMO_COMPANIONS = [
  { id: 'c1', slot: 'friend', base: '🦊' },
  { id: 'c2', slot: 'friend', base: '🐧' },
  { id: 'c3', slot: 'pet', model: 'petDog', colors: { a: '#e8d3b0' } },
  { id: 'c4', slot: 'pet', model: 'petCat', colors: { a: '#f8b26a' } },
  { id: 'c5', slot: 'pet', model: 'petButterfly', colors: { a: '#60a5fa' } },
  { id: 'c6', slot: 'pet', model: 'petChick', colors: { a: '#fde047' } },
];

const DEMO_AVATAR = { base: '🐬', hat: 'hat_crown', face: null, acc: 'acc_balloon' };

export default function DemoRoom() {
  const [space, setSpace] = useState('room');
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/" className="text-2xl">🏦</Link>
        <h1 className="text-2xl text-purple-600">
          {{ garden: '🌳 3D 정원', classroom: '🏫 3D 교실', cafe: '☕ 3D 카페', room: '🛋️ 3D 마이룸' }[space]} 미리보기
        </h1>
        <div className="flex rounded-2xl bg-white shadow overflow-hidden">
          {[['room', '🛋️ 방'], ['garden', '🌳 정원'], ['classroom', '🏫 교실'], ['cafe', '☕ 카페']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSpace(id)}
              className={`px-4 py-1.5 text-sm transition ${space === id ? 'bg-purple-500 text-white' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400">드래그: 돌려보기 · 바닥 클릭: 캐릭터 이동</span>
      </div>
      <RoomScene
        key={space}
        mode={space}
        avatar={DEMO_AVATAR}
        roomMap={{ garden: DEMO_GARDEN, classroom: DEMO_CLASS, cafe: DEMO_CAFE, room: DEMO_ROOM }[space]}
        companions={DEMO_COMPANIONS}
        wallId="wall_sky"
        floorId="floor_wood"
        height="70vh"
      />
      <p className="text-center text-gray-400 text-sm">
        학급에 입장하면 아이템을 사서 나만의 방과 정원을 꾸밀 수 있어요! <Link to="/" className="text-purple-500 underline">입장하러 가기 →</Link>
      </p>
    </div>
  );
}
