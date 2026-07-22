import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, updateDoc, runTransaction, arrayUnion, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import {
  AVATAR_BASES, SPECIES, ITEMS, ITEM_MAP, SLOT_LABEL,
  normalizeRoom, canPlaceAt,
} from '../../lib/items';
import RoomScene from '../../three/RoomScene.jsx';

const CATS = [
  ['all', '전체'], ['room', '🛋️ 가구'], ['garden', '🌳 정원'], ['hat', '🎩 모자'],
  ['face', '👓 얼굴'], ['acc', '🎈 손'], ['wall', '🧱 벽지'], ['floor', '🟫 바닥'],
];

export default function RoomPage() {
  const { klass, student } = useOutletContext();
  const [tab, setTab] = useState('inv'); // inv | avatar | shop
  const [space, setSpace] = useState('room'); // room | garden
  const [placing, setPlacing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [shopCat, setShopCat] = useState('all');
  const [msg, setMsg] = useState(null);
  const glRef = useRef(null);

  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const inventory = student.inventory || [];
  const avatar = student.avatar || { base: '🐰' };
  const roomMap = normalizeRoom(student.room);
  const gardenMap = normalizeRoom(student.garden);
  const activeMap = space === 'garden' ? gardenMap : roomMap;
  const skin = student.roomSkin || {};

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  /* ----- 구매 ----- */
  const buyItem = async (item) => {
    if (inventory.includes(item.id)) return;
    if (!confirm(`'${item.name}'을(를) ${fmt(item.price)}${klass.currency}에 살까요?`)) return;
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        if ((s.inventory || []).includes(item.id)) throw new Error('이미 가지고 있어요!');
        if (s.cash < item.price) throw new Error('현금이 부족해요!');
        tx.update(studentRef, { cash: s.cash - item.price, inventory: arrayUnion(item.id) });
      });
      flash('ok', `🛍️ '${item.name}' 구매 완료!`);
    } catch (e) {
      flash('err', e.message);
    }
  };

  /* ----- 배치 (space: room 또는 garden 필드) ----- */
  const onPlace = async (key) => {
    const item = ITEM_MAP[placing];
    if (!item) return;
    const prevKey = Object.keys(activeMap).find((k) => activeMap[k].id === placing) || null;
    if (!canPlaceAt(activeMap, key, item, 0, prevKey)) {
      flash('err', '거기엔 놓을 수 없어요! (공간 부족)');
      return;
    }
    const updates = { [`${space}.${key}`]: { id: placing, rot: 0 } };
    if (prevKey && prevKey !== key) updates[`${space}.${prevKey}`] = deleteField();
    await updateDoc(studentRef, updates);
    setPlacing(null);
  };

  const rotateSelected = async () => {
    const pl = activeMap[selected];
    if (!pl) return;
    const item = ITEM_MAP[pl.id];
    const newRot = ((pl.rot || 0) + 1) % 4;
    if (!canPlaceAt(activeMap, selected, item, newRot, selected)) {
      flash('err', '회전할 공간이 없어요!');
      return;
    }
    await updateDoc(studentRef, { [`${space}.${selected}`]: { id: pl.id, rot: newRot } });
  };

  const pickupSelected = async () => {
    await updateDoc(studentRef, { [`${space}.${selected}`]: deleteField() });
    setSelected(null);
  };

  // 아이템 슬롯에 맞는 공간으로 전환하며 배치 시작
  const startPlacing = (item) => {
    const target = item.slot === 'garden' ? 'garden' : 'room';
    if (target !== space) setSpace(target);
    setPlacing(placing === item.id ? null : item.id);
    setSelected(null);
  };

  /* ----- 아바타 / 스킨 ----- */
  const setBase = (b) => updateDoc(studentRef, { 'avatar.base': b });
  const equip = (item) =>
    updateDoc(studentRef, { [`avatar.${item.slot}`]: avatar[item.slot] === item.id ? null : item.id });
  const applySkin = (item) =>
    updateDoc(studentRef, { [`roomSkin.${item.slot}`]: skin[item.slot] === item.id ? null : item.id });

  /* ----- 인증샷 (WebGL 캔버스 캡처) ----- */
  const screenshot = () => {
    const gl = glRef.current;
    if (!gl) return flash('err', '방이 아직 준비되지 않았어요.');
    const src = gl.domElement;
    const cv = document.createElement('canvas');
    cv.width = src.width;
    cv.height = src.height + 110;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fdf6e9';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(src, 0, 70);
    ctx.fillStyle = '#4338ca';
    ctx.font = `${Math.round(cv.width / 22)}px Jua, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${student.name}의 ${space === 'garden' ? '정원' : '마이룸'}`, cv.width / 2, 48);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${Math.round(cv.width / 50)}px Jua, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`${klass.name} · ${new Date().toLocaleDateString('ko-KR')}`, cv.width - 18, cv.height - 16);
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = `${student.name}_${space === 'garden' ? '정원' : '마이룸'}.png`;
    a.click();
    flash('ok', '📸 인증샷을 저장했어요!');
  };

  const owned = (slot) => ITEMS.filter((i) => i.slot === slot && inventory.includes(i.id));
  const shopItems = ITEMS.filter((i) => shopCat === 'all' || i.slot === shopCat);
  const selectedItem = selected && activeMap[selected] ? ITEM_MAP[activeMap[selected].id] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-2xl text-purple-600">{space === 'garden' ? '🌳 마이 정원' : '🛋️ 마이룸'}</h2>
        <div className="flex rounded-2xl bg-white shadow overflow-hidden">
          {[['room', '🛋️ 방'], ['garden', '🌳 정원']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setSpace(id); setPlacing(null); setSelected(null); }}
              className={`px-4 py-1.5 text-sm transition ${space === id ? 'bg-purple-500 text-white' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 hidden sm:block">드래그: 돌려보기 · 바닥 클릭: 캐릭터 이동</span>
        <button onClick={screenshot} className="ml-auto rounded-xl px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white shadow">
          📸 인증샷
        </button>
      </div>

      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {/* 3D 방 */}
      <div className="relative">
        <RoomScene
          key={space}
          mode={space}
          avatar={avatar}
          roomMap={activeMap}
          wallId={skin.wall}
          floorId={skin.floor}
          placing={placing}
          onPlace={onPlace}
          selectedKey={selected}
          onSelectFurniture={setSelected}
          glRef={glRef}
        />
        {placing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-purple-600/90 text-white rounded-2xl px-4 py-2 text-sm flex items-center gap-3">
            {ITEM_MAP[placing]?.emoji} '{ITEM_MAP[placing]?.name}' 놓을 곳을 클릭!
            <button onClick={() => setPlacing(null)} className="bg-white/20 rounded-lg px-2">취소</button>
          </div>
        )}
        {selectedItem && !placing && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 rounded-2xl shadow-lg px-4 py-2 flex items-center gap-2">
            <span className="text-xl">{selectedItem.emoji}</span>
            <span className="text-sm">{selectedItem.name}</span>
            <button onClick={rotateSelected} className="rounded-lg px-3 py-1 bg-indigo-500 text-white text-sm">🔄 회전</button>
            <button onClick={pickupSelected} className="rounded-lg px-3 py-1 bg-rose-500 text-white text-sm">📦 회수</button>
            <button onClick={() => setSelected(null)} className="text-gray-400 px-1">✕</button>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        {[['inv', '📦 인벤토리'], ['avatar', '🐰 캐릭터'], ['shop', '🛍️ 아이템 상점']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setPlacing(null); setSelected(null); }}
            className={`px-4 py-2 rounded-2xl transition ${tab === id ? 'bg-purple-500 text-white shadow' : 'bg-white text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 인벤토리: 가구 배치 + 벽지/바닥 적용 */}
      {tab === 'inv' && (
        <div className="bg-white rounded-3xl shadow p-5 space-y-5">
          {[['room', '🛋️ 가구·소품', roomMap], ['garden', '🌳 정원 아이템', gardenMap]].map(([slot, label, map]) => (
            <div key={slot}>
              <h4 className="text-gray-500 mb-2">{label} <span className="text-xs text-gray-300">누르고 바닥을 클릭하면 배치돼요</span></h4>
              {owned(slot).length ? (
                <div className="flex flex-wrap gap-2">
                  {owned(slot).map((item) => {
                    const placed = Object.values(map).some((p) => p.id === item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => startPlacing(item)}
                        className={`rounded-2xl border-2 p-2.5 text-center transition ${
                          placing === item.id ? 'border-purple-500 bg-purple-50 scale-105'
                            : placed ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 hover:border-purple-300'
                        }`}
                        style={{ width: 88 }}
                      >
                        <div className="text-2xl">{item.emoji}</div>
                        <div className="text-[11px] mt-0.5 leading-tight">{item.name}</div>
                        <div className="text-[10px] text-gray-400">{placed ? '배치됨' : '보관 중'}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  아직 {slot === 'garden' ? '정원 아이템' : '가구'}이 없어요. 상점에서 사 보세요!
                </p>
              )}
            </div>
          ))}
          {['wall', 'floor'].map((slot) => (
            <div key={slot}>
              <h4 className="text-gray-500 mb-2">{SLOT_LABEL[slot]}</h4>
              {owned(slot).length ? (
                <div className="flex flex-wrap gap-2">
                  {owned(slot).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => applySkin(item)}
                      className={`rounded-2xl border-2 px-3 py-2 flex items-center gap-2 transition ${
                        skin[slot] === item.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg border border-gray-200" style={{ background: item.colors.a }} />
                      <span className="text-sm">{item.name}</span>
                      {skin[slot] === item.id && <span className="text-purple-500 text-xs">적용 중</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-300 text-sm">상점에서 {SLOT_LABEL[slot]}를 사면 방 분위기를 바꿀 수 있어요!</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 캐릭터 꾸미기 */}
      {tab === 'avatar' && (
        <div className="bg-white rounded-3xl shadow p-5 space-y-5">
          <div>
            <h4 className="text-gray-500 mb-2">기본 캐릭터 (무료)</h4>
            <div className="flex flex-wrap gap-2">
              {AVATAR_BASES.map((b) => (
                <button
                  key={b}
                  onClick={() => setBase(b)}
                  title={SPECIES[b]?.name}
                  className={`text-3xl w-14 h-14 rounded-2xl border-2 transition ${
                    avatar.base === b ? 'border-purple-500 bg-purple-50 scale-110' : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          {['hat', 'face', 'acc'].map((slot) => (
            <div key={slot}>
              <h4 className="text-gray-500 mb-2">{SLOT_LABEL[slot]}</h4>
              {owned(slot).length ? (
                <div className="flex flex-wrap gap-2">
                  {owned(slot).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => equip(item)}
                      title={item.name}
                      className={`text-2xl w-14 h-14 rounded-2xl border-2 transition ${
                        avatar[slot] === item.id ? 'border-purple-500 bg-purple-50 scale-110' : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-300">아직 없는 종류예요. 상점에서 사 보세요!</p>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400">착용하면 위 3D 캐릭터에 바로 나타나요!</p>
        </div>
      )}

      {/* 아이템 상점 */}
      {tab === 'shop' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {CATS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setShopCat(id)}
                className={`px-3 py-1.5 rounded-xl text-sm transition ${
                  shopCat === id ? 'bg-purple-500 text-white' : 'bg-white text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto text-sm text-gray-400 self-center">{shopItems.length}개 아이템</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {shopItems.map((item) => {
              const has = inventory.includes(item.id);
              return (
                <div key={item.id} className={`bg-white rounded-2xl shadow p-3 text-center ${has ? 'opacity-60' : ''}`}>
                  {item.slot === 'wall' || item.slot === 'floor' ? (
                    <div className="w-12 h-12 rounded-xl mx-auto mb-1 border border-gray-200" style={{ background: item.colors.a }} />
                  ) : (
                    <div className="text-4xl mb-1">{item.emoji}</div>
                  )}
                  <div className="text-sm leading-tight">{item.name}</div>
                  <div className="text-[10px] text-gray-400 mb-1.5">{SLOT_LABEL[item.slot]}</div>
                  {has ? (
                    <div className="text-emerald-500 text-sm">보유 중 ✓</div>
                  ) : (
                    <button
                      onClick={() => buyItem(item)}
                      className={`w-full rounded-xl py-1.5 text-sm text-white ${
                        student.cash >= item.price ? 'bg-purple-400 hover:bg-purple-500' : 'bg-gray-300'
                      }`}
                    >
                      {fmt(item.price)} {klass.currency}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
