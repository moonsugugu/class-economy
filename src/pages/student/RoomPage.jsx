import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, updateDoc, runTransaction, arrayUnion, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import {
  SPECIES, SPECIES_GROUP, CHAR_ITEMS, CHAR_BY_BASE, speciesOf,
  ITEMS, ITEM_MAP, SLOT_LABEL, SETS, setPrice,
  normalizeRoom, canPlaceAt,
} from '../../lib/items';
import RoomScene from '../../three/RoomScene.jsx';
import { ThumbProvider, ItemThumb } from '../../three/Thumbs.jsx';

const SPACES = [
  ['room', '🛋️ 내 방'],
  ['garden', '🌳 정원'],
  ['classroom', '🏫 교실'],
];

// 상점 분류 → 아이템 슬롯
const CATS = [
  ['char', '🐰 캐릭터', ['char']],
  ['deco', '👑 꾸미기', ['hat', 'face', 'acc']],
  ['room', '🛋️ 가구', ['room']],
  ['garden', '🌳 정원', ['garden']],
  ['class', '🏫 교실', ['class']],
  ['light', '💡 조명', ['light']],
  ['skin', '🎨 벽지·바닥', ['wall', 'floor']],
  ['set', '🎁 세트', null],
];

export default function RoomPage() {
  const ctx = useOutletContext();
  return (
    <ThumbProvider>
      <RoomInner {...ctx} />
    </ThumbProvider>
  );
}

function RoomInner({ klass, student }) {
  const [tab, setTab] = useState('inv');      // inv | avatar | shop
  const [space, setSpace] = useState('room'); // room | garden | classroom
  const [placing, setPlacing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [shopCat, setShopCat] = useState('char');
  const [msg, setMsg] = useState(null);
  const glRef = useRef(null);

  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const inventory = student.inventory || [];
  const avatar = student.avatar || {};
  const maps = {
    room: normalizeRoom(student.room),
    garden: normalizeRoom(student.garden),
    classroom: normalizeRoom(student.classroom),
  };
  const activeMap = maps[space];
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
        const upd = { cash: s.cash - item.price, inventory: arrayUnion(item.id) };
        // 캐릭터를 처음 사면 바로 그 모습으로 바뀌어요
        if (item.slot === 'char' && !s.avatar?.base) upd['avatar.base'] = item.base;
        tx.update(studentRef, upd);
      });
      flash('ok', `🛍️ '${item.name}' 구매 완료!`);
    } catch (e) {
      flash('err', e.message);
    }
  };

  /* ----- 세트 구매 ----- */
  const buySet = async (set) => {
    const { need, full, price, saved } = setPrice(set, inventory);
    if (!need.length) return flash('err', '이미 세트를 다 가지고 있어요!');
    if (!confirm(`${set.name}\n${need.length}개 아이템을 ${fmt(price)}${klass.currency}에 살까요?\n(따로 사면 ${fmt(full)} → ${fmt(saved)} 절약!)`)) return;
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const inv = s.inventory || [];
        const stillNeed = set.items.filter((id) => !inv.includes(id) && ITEM_MAP[id]);
        if (!stillNeed.length) throw new Error('이미 다 가지고 있어요!');
        const cost = Math.floor(stillNeed.reduce((a, id) => a + ITEM_MAP[id].price, 0) * (1 - set.off));
        if (s.cash < cost) throw new Error('현금이 부족해요!');
        tx.update(studentRef, { cash: s.cash - cost, inventory: [...inv, ...stillNeed] });
      });
      flash('ok', `🎁 ${set.name} 구매 완료! ${fmt(saved)}${klass.currency} 아꼈어요.`);
    } catch (e) {
      flash('err', e.message);
    }
  };

  /* ----- 배치 ----- */
  const onPlace = async (key) => {
    const item = ITEM_MAP[placing];
    if (!item) return;
    const prevKey = Object.keys(activeMap).find((k) => activeMap[k].id === placing) || null;
    if (!canPlaceAt(activeMap, key, item, 0, prevKey)) {
      flash('err', '거기엔 놓을 수 없어요! (공간이 부족해요)');
      return;
    }
    const updates = { [`${space}.${key}`]: { id: placing, rot: 0 } };
    // 다른 공간에 놓여 있던 같은 아이템은 회수해요
    for (const sp of ['room', 'garden', 'classroom']) {
      const prev = Object.keys(maps[sp]).find((k) => maps[sp][k].id === placing);
      if (prev && !(sp === space && prev === key)) updates[`${sp}.${prev}`] = deleteField();
    }
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

  // 아이템 종류에 맞는 공간으로 자동 전환하며 배치 시작
  const startPlacing = (item) => {
    const target = item.slot === 'garden' ? 'garden' : item.slot === 'class' ? 'classroom' : space;
    if (item.slot === 'room' && space === 'garden') { /* 가구는 실내로 */ }
    const dest = item.slot === 'room' ? (space === 'garden' ? 'room' : space) : target;
    if (dest !== space) setSpace(dest);
    setPlacing(placing === item.id ? null : item.id);
    setSelected(null);
  };

  /* ----- 아바타 / 스킨 ----- */
  const equipChar = (base) => updateDoc(studentRef, { 'avatar.base': base });
  const equip = (item) =>
    updateDoc(studentRef, { [`avatar.${item.slot}`]: avatar[item.slot] === item.id ? null : item.id });
  const applySkin = (item) =>
    updateDoc(studentRef, { [`roomSkin.${item.slot}`]: skin[item.slot] === item.id ? null : item.id });

  /* ----- 인증샷 ----- */
  const screenshot = () => {
    const gl = glRef.current;
    if (!gl) return flash('err', '아직 준비 중이에요. 잠시 후 다시 눌러 주세요.');
    const src = gl.domElement;
    const cv = document.createElement('canvas');
    cv.width = src.width;
    cv.height = src.height + 110;
    const c = cv.getContext('2d');
    c.fillStyle = '#fdf6e9';
    c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(src, 0, 70);
    const title = SPACES.find(([id]) => id === space)[1].replace(/^\S+\s/, '');
    c.fillStyle = '#4338ca';
    c.font = `${Math.round(cv.width / 22)}px Jua, sans-serif`;
    c.textAlign = 'center';
    c.fillText(`${student.name}의 ${title}`, cv.width / 2, 48);
    c.fillStyle = '#94a3b8';
    c.font = `${Math.round(cv.width / 50)}px Jua, sans-serif`;
    c.textAlign = 'right';
    c.fillText(`${klass.name} · ${new Date().toLocaleDateString('ko-KR')}`, cv.width - 18, cv.height - 16);
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = `${student.name}_${title}.png`;
    a.click();
    flash('ok', '📸 인증샷을 저장했어요!');
  };

  const owned = (slot) => ITEMS.filter((i) => i.slot === slot && inventory.includes(i.id));
  const selectedItem = selected && activeMap[selected] ? ITEM_MAP[activeMap[selected].id] : null;
  const myChars = CHAR_ITEMS.filter((c) => inventory.includes(c.id));
  const spaceLabel = SPACES.find(([id]) => id === space)[1];

  return (
    <div className="space-y-4">
      {/* 상단 */}
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-2xl text-purple-600">{spaceLabel}</h2>
        <div className="flex rounded-2xl bg-white shadow overflow-hidden">
          {SPACES.map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setSpace(id); setPlacing(null); setSelected(null); }}
              className={`px-3 py-1.5 text-sm transition ${space === id ? 'bg-purple-500 text-white' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={screenshot} className="ml-auto rounded-xl px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white shadow">
          📸 인증샷
        </button>
      </div>

      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {/* 3D 공간 */}
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
            '{ITEM_MAP[placing]?.name}' 놓을 곳을 클릭!
            <button onClick={() => setPlacing(null)} className="bg-white/20 rounded-lg px-2">취소</button>
          </div>
        )}
        {selectedItem && !placing && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 rounded-2xl shadow-lg px-4 py-2 flex items-center gap-2">
            <span className="text-sm">{selectedItem.name}</span>
            <button onClick={rotateSelected} className="rounded-lg px-3 py-1 bg-indigo-500 text-white text-sm">🔄 회전</button>
            <button onClick={pickupSelected} className="rounded-lg px-3 py-1 bg-rose-500 text-white text-sm">📦 회수</button>
            <button onClick={() => setSelected(null)} className="text-gray-400 px-1">✕</button>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        {[['inv', '📦 인벤토리'], ['avatar', '🐰 캐릭터'], ['shop', '🛍️ 상점']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setPlacing(null); setSelected(null); }}
            className={`px-4 py-2 rounded-2xl transition ${tab === id ? 'bg-purple-500 text-white shadow' : 'bg-white text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 인벤토리 */}
      {tab === 'inv' && (
        <div className="bg-white rounded-3xl shadow p-5 space-y-5">
          {[['room', '🛋️ 가구·소품'], ['garden', '🌳 정원'], ['class', '🏫 교실'], ['light', '💡 조명']].map(([slot, label]) => (
            <div key={slot}>
              <h4 className="text-gray-500 mb-2">{label} <span className="text-xs text-gray-300">누르고 바닥을 클릭하면 배치돼요</span></h4>
              {owned(slot).length ? (
                <div className="flex flex-wrap gap-2">
                  {owned(slot).map((item) => {
                    const placedIn = ['room', 'garden', 'classroom'].find((sp) =>
                      Object.values(maps[sp]).some((p) => p.id === item.id));
                    return (
                      <button
                        key={item.id}
                        onClick={() => startPlacing(item)}
                        className={`rounded-2xl border-2 p-2 text-center transition ${
                          placing === item.id ? 'border-purple-500 bg-purple-50 scale-105'
                            : placedIn ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 hover:border-purple-300'
                        }`}
                        style={{ width: 92 }}
                      >
                        <ItemThumb id={item.id} size={48} />
                        <div className="text-[11px] mt-0.5 leading-tight">{item.name}</div>
                        <div className="text-[10px] text-gray-400">
                          {placedIn ? SPACES.find(([s]) => s === placedIn)[1].slice(0, 3) : '보관 중'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">아직 없어요. 상점에서 사 보세요!</p>
              )}
            </div>
          ))}
          {['wall', 'floor'].map((slot) => (
            <div key={slot}>
              <h4 className="text-gray-500 mb-2">{SLOT_LABEL[slot]} <span className="text-xs text-gray-300">내 방에 적용돼요</span></h4>
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
                <p className="text-gray-300 text-sm">상점에서 사면 방 분위기를 바꿀 수 있어요!</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 캐릭터 */}
      {tab === 'avatar' && (
        <div className="bg-white rounded-3xl shadow p-5 space-y-5">
          <div>
            <h4 className="text-gray-500 mb-1">내 캐릭터 ({myChars.length}/{CHAR_ITEMS.length}종)</h4>
            <p className="text-xs text-gray-400 mb-2">캐릭터는 상점에서 사야 쓸 수 있어요. 산 캐릭터는 언제든 바꿔 가며 놀 수 있어요!</p>
            {myChars.length ? (
              <div className="flex flex-wrap gap-2">
                {myChars.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => equipChar(c.base)}
                    className={`rounded-2xl border-2 p-2 transition ${
                      avatar.base === c.base ? 'border-purple-500 bg-purple-50 scale-105' : 'border-gray-200 hover:border-purple-300'
                    }`}
                    style={{ width: 86 }}
                  >
                    <ItemThumb id={c.id} size={52} />
                    <div className="text-[11px]">{c.name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-purple-50 rounded-2xl p-4 text-center text-purple-600 text-sm">
                아직 캐릭터가 없어요! 🛍️ 상점 → 🐰 캐릭터에서 마음에 드는 친구를 데려오세요.
              </div>
            )}
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
                      className={`rounded-2xl border-2 p-2 transition ${
                        avatar[slot] === item.id ? 'border-purple-500 bg-purple-50 scale-105' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      style={{ width: 78 }}
                    >
                      <ItemThumb id={item.id} size={44} />
                      <div className="text-[10px] leading-tight">{item.name}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-300">아직 없는 종류예요. 상점에서 사 보세요!</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 상점 */}
      {tab === 'shop' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {CATS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setShopCat(id)}
                className={`px-3 py-1.5 rounded-xl text-sm transition ${shopCat === id ? 'bg-purple-500 text-white' : 'bg-white text-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {shopCat === 'set' ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {SETS.map((set) => {
                const { need, full, price, saved } = setPrice(set, inventory);
                const done = !need.length;
                return (
                  <div key={set.id} className={`bg-white rounded-3xl shadow p-5 ${done ? 'opacity-60' : ''}`}>
                    <h4 className="text-lg">{set.name}</h4>
                    <p className="text-xs text-gray-400 mb-2">{set.desc}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {set.items.map((id) => ITEM_MAP[id] && (
                        <div key={id} className="text-center" style={{ width: 54 }}>
                          <ItemThumb id={id} size={40} />
                          <div className="text-[9px] text-gray-400 leading-tight">{ITEM_MAP[id].name}</div>
                        </div>
                      ))}
                    </div>
                    {done ? (
                      <div className="text-emerald-500 text-center">세트 완성! ✓</div>
                    ) : (
                      <button
                        onClick={() => buySet(set)}
                        className={`w-full rounded-xl py-2 text-white ${student.cash >= price ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-300'}`}
                      >
                        {fmt(price)} {klass.currency}
                        <span className="text-xs line-through opacity-70 ml-2">{fmt(full)}</span>
                        <span className="text-xs ml-1">({set.off * 100}% 할인)</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : shopCat === 'char' ? (
            Object.entries(SPECIES_GROUP).map(([g, gLabel]) => (
              <div key={g}>
                <h4 className="text-gray-500 mb-2">{gLabel}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
                  {CHAR_ITEMS.filter((c) => c.group === g).map((c) => {
                    const has = inventory.includes(c.id);
                    return (
                      <div key={c.id} className={`bg-white rounded-2xl shadow p-3 text-center ${has ? 'opacity-70' : ''}`}>
                        <ItemThumb id={c.id} size={64} />
                        <div className="text-sm leading-tight mt-1">{c.name}</div>
                        {has ? (
                          <button
                            onClick={() => equipChar(c.base)}
                            className={`w-full rounded-xl py-1.5 text-sm mt-1 ${
                              avatar.base === c.base ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            {avatar.base === c.base ? '사용 중 ✓' : '이걸로 바꾸기'}
                          </button>
                        ) : (
                          <button
                            onClick={() => buyItem(c)}
                            className={`w-full rounded-xl py-1.5 text-sm text-white mt-1 ${
                              student.cash >= c.price ? 'bg-purple-400 hover:bg-purple-500' : 'bg-gray-300'
                            }`}
                          >
                            🔒 {fmt(c.price)} {klass.currency}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {ITEMS.filter((i) => (CATS.find(([id]) => id === shopCat)[2] || []).includes(i.slot)).map((item) => {
                const has = inventory.includes(item.id);
                return (
                  <div key={item.id} className={`bg-white rounded-2xl shadow p-3 text-center ${has ? 'opacity-60' : ''}`}>
                    <ItemThumb id={item.id} size={56} />
                    <div className="text-sm leading-tight mt-1">{item.name}</div>
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
          )}
        </div>
      )}
    </div>
  );
}
