import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, updateDoc, runTransaction, increment, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import {
  SPECIES_GROUP, CHAR_ITEMS, FRIEND_ITEMS, isCompanion,
  ITEMS, ITEM_MAP, SLOT_LABEL, SETS,
  normalizeRoom, canPlaceAt, isStackableRoomItem,
} from '../../lib/items';
import RoomScene from '../../three/RoomScene.jsx';
import { ThumbProvider, ItemThumb } from '../../three/Thumbs.jsx';
import { itemPrice, pricePolicyLabel } from '../../lib/pricing';
import { TAX_LEDGER_ID, taxForPart } from '../../lib/taxes';

const SPACES = [
  ['room', '🛋️ 내 방'],
  ['garden', '🌳 정원'],
  ['classroom', '🏫 교실'],
  ['cafe', '☕ 카페'],
];
const SPACE_KEYS = SPACES.map(([id]) => id);

// 상점 분류 → 아이템 슬롯
const CATS = [
  ['char', '🐰 캐릭터', ['char']],
  ['friend', '👫 친구', ['friend']],
  ['pet', '🐾 애완동물', ['pet']],
  ['deco', '👑 꾸미기', ['hat', 'face', 'acc']],
  ['room', '🛋️ 가구', ['room']],
  ['garden', '🌳 정원', ['garden']],
  ['class', '🏫 교실', ['class']],
  ['cafe', '☕ 카페', ['cafe']],
  ['light', '💡 조명', ['light']],
  ['skin', '🎨 벽지·바닥', ['wall', 'floor']],
  ['set', '🎁 세트', null],
];

const MAX_WALKING = 8; // 한 번에 데리고 다닐 수 있는 수

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
  const [previewItem, setPreviewItem] = useState(null);
  const glRef = useRef(null);

  const studentRef = doc(db, 'classes', klass.id, 'students', student.id);
  const classRef = doc(db, 'classes', klass.id);
  const ledgerRef = doc(db, 'classes', klass.id, 'taxLedger', TAX_LEDGER_ID);
  const inventory = student.inventory || [];
  const costOf = (item) => itemPrice(item.price, klass);
  const setPriceFor = (set, inv) => {
    const need = set.items.filter((id) => !inv.includes(id) && ITEM_MAP[id]);
    const full = need.reduce((sum, id) => sum + costOf(ITEM_MAP[id]), 0);
    const price = Math.floor(full * (1 - set.off));
    return { need, full, price, saved: full - price };
  };
  const avatar = student.avatar || {};
  const maps = {
    room: normalizeRoom(student.room),
    garden: normalizeRoom(student.garden),
    classroom: normalizeRoom(student.classroom),
    cafe: normalizeRoom(student.cafe),
  };
  const activeMap = maps[space];
  const skin = student.roomSkin || {};

  // 함께 다니는 친구·애완동물 (없으면 가진 것 전부)
  const walking = student.walking || [];
  const companions = walking
    .map((id) => ITEM_MAP[id])
    .filter((i) => i && inventory.includes(i.id))
    .slice(0, MAX_WALKING);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  /* ----- 구매 ----- */
  const buyItem = async (item) => {
    const stackable = isStackableRoomItem(item.slot);
    if (inventory.includes(item.id) && !stackable) return;
    const price = costOf(item);
    const previewTax = taxForPart(price, klass, 'item').tax;
    const previewTotal = price + previewTax;
    if (!confirm(`'${item.name}'을(를) 살까요?\n상품가 ${fmt(price)} + 세금 ${fmt(previewTax)} = 총 ${fmt(previewTotal)}${klass.currency}`)) return;
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const settings = { ...klass, ...((await tx.get(classRef)).data() || {}) };
        const currentPrice = itemPrice(item.price, settings);
        const tax = taxForPart(currentPrice, settings, 'item').tax;
        const total = currentPrice + tax;
        const inv = s.inventory || [];
        if (inv.includes(item.id) && !stackable) throw new Error('이미 가지고 있어요!');
        if (s.cash < total) throw new Error('현금이 부족해요!');
        const upd = {
          cash: s.cash - total,
          inventory: stackable ? [...inv, item.id] : arrayUnion(item.id),
        };
        // 캐릭터를 처음 사면 바로 그 모습으로 바뀌어요
        if (item.slot === 'char' && !s.avatar?.base) upd['avatar.base'] = item.base;
        // 친구·애완동물은 사자마자 함께 다녀요
        if (isCompanion(item.slot) && (s.walking || []).length < MAX_WALKING) {
          upd.walking = arrayUnion(item.id);
        }
        tx.update(studentRef, upd);
        if (tax > 0) {
          tx.set(ledgerRef, {
            pending: increment(tax),
            item: increment(tax),
            updatedAt: Date.now(),
          }, { merge: true });
        }
      });
      flash('ok', `🛍️ '${item.name}' 구매 완료!`);
    } catch (e) {
      flash('err', e.message);
    }
  };

  /* ----- 세트 구매 ----- */
  const buySet = async (set) => {
    const { need, full, price, saved } = setPriceFor(set, inventory);
    if (!need.length) return flash('err', '이미 세트를 다 가지고 있어요!');
    const previewTax = taxForPart(price, klass, 'item').tax;
    const previewTotal = price + previewTax;
    if (!confirm(`${set.name}\n${need.length}개 아이템을 살까요?\n상품가 ${fmt(price)} + 세금 ${fmt(previewTax)} = 총 ${fmt(previewTotal)}${klass.currency}\n(따로 사면 ${fmt(full)} → ${fmt(saved)} 절약!)`)) return;
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const settings = { ...klass, ...((await tx.get(classRef)).data() || {}) };
        const inv = s.inventory || [];
        const stillNeed = set.items.filter((id) => !inv.includes(id) && ITEM_MAP[id]);
        if (!stillNeed.length) throw new Error('이미 다 가지고 있어요!');
        const cost = Math.floor(stillNeed.reduce((a, id) => a + itemPrice(ITEM_MAP[id].price, settings), 0) * (1 - set.off));
        const tax = taxForPart(cost, settings, 'item').tax;
        const total = cost + tax;
        if (s.cash < total) throw new Error('현금이 부족해요!');
        tx.update(studentRef, { cash: s.cash - total, inventory: [...inv, ...stillNeed] });
        if (tax > 0) {
          tx.set(ledgerRef, {
            pending: increment(tax),
            item: increment(tax),
            updatedAt: Date.now(),
          }, { merge: true });
        }
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
    const placedCount = SPACE_KEYS.reduce((count, sp) =>
      count + Object.values(maps[sp]).filter((p) => p.id === placing).length, 0);
    const ownedCount = inventory.filter((id) => id === placing).length;
    if (placedCount >= ownedCount) {
      flash('err', '가지고 있는 수량만큼 모두 배치했어요. 기존 배치를 먼저 집어 주세요.');
      return;
    }
    const prevKey = null;
    if (!canPlaceAt(activeMap, key, item, 0, prevKey)) {
      flash('err', '거기엔 놓을 수 없어요! (공간이 부족해요)');
      return;
    }
    const updates = { [`${space}.${key}`]: { id: placing, rot: 0 } };
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
  const SLOT_SPACE = { garden: 'garden', class: 'classroom', cafe: 'cafe' };
  const startPlacing = (item) => {
    const dest = SLOT_SPACE[item.slot]
      || (item.slot === 'room' && space === 'garden' ? 'room' : space); // 조명은 지금 공간에 그대로
    if (dest !== space) setSpace(dest);
    setPlacing(placing === item.id ? null : item.id);
    setSelected(null);
  };

  /* ----- 👫🐾 함께 다니기 켜고 끄기 ----- */
  const toggleWalking = async (item) => {
    const on = walking.includes(item.id);
    if (!on && walking.length >= MAX_WALKING) {
      return flash('err', `한 번에 ${MAX_WALKING}마리까지만 데리고 다닐 수 있어요!`);
    }
    await updateDoc(studentRef, { walking: on ? arrayRemove(item.id) : arrayUnion(item.id) });
  };

  /* ----- 아바타 / 스킨 ----- */
  const equipChar = (base) => updateDoc(studentRef, { 'avatar.base': base });
  const equip = (item) =>
    updateDoc(studentRef, { [`avatar.${item.slot}`]: avatar[item.slot] === item.id ? null : item.id });
  const applySkin = (item) =>
    updateDoc(studentRef, { [`roomSkin.${item.slot}`]: skin[item.slot] === item.id ? null : item.id });

  const refundItem = async (item) => {
    const refundPrice = Math.floor(costOf(item) * 0.5);
    if (!confirm(`'${item.name}'을(를) 구매가의 50%인 ${fmt(refundPrice)}${klass.currency}에 환불할까요?`)) return;
    try {
      await runTransaction(db, async (tx) => {
        const s = (await tx.get(studentRef)).data();
        const inv = [...(s.inventory || [])];
        const inventoryIndex = inv.indexOf(item.id);
        if (inventoryIndex < 0) throw new Error('환불할 아이템을 찾지 못했어요.');
        inv.splice(inventoryIndex, 1);
        const upd = {
          cash: (s.cash || 0) + refundPrice,
          inventory: inv,
        };

        for (const sp of SPACE_KEYS) {
          const map = normalizeRoom(s[sp]);
          const placedKey = Object.keys(map).find((key) => map[key].id === item.id);
          if (placedKey) {
            upd[`${sp}.${placedKey}`] = deleteField();
            break;
          }
        }
        if (isCompanion(item.slot)) {
          const nextWalking = [...(s.walking || [])];
          const walkingIndex = nextWalking.indexOf(item.id);
          if (walkingIndex >= 0) nextWalking.splice(walkingIndex, 1);
          upd.walking = nextWalking;
        }
        if (item.slot === 'char' && s.avatar?.base === item.base) upd['avatar.base'] = deleteField();
        if (s.avatar?.[item.slot] === item.id) upd[`avatar.${item.slot}`] = deleteField();
        if (s.roomSkin?.[item.slot] === item.id) upd[`roomSkin.${item.slot}`] = deleteField();
        tx.update(studentRef, upd);
      });
      setSelected(null);
      setPlacing(null);
      flash('ok', `♻️ '${item.name}' 환불 완료! 구매가의 50%를 돌려받았어요.`);
    } catch (e) {
      flash('err', e.message);
    }
  };

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

  const owned = (slot) => inventory.flatMap((id, inventoryIndex) => {
    const item = ITEM_MAP[id];
    return item?.slot === slot ? [{ ...item, inventoryIndex }] : [];
  });
  const inventoryItems = inventory.flatMap((id, inventoryIndex) => {
    const item = ITEM_MAP[id];
    return item ? [{ ...item, inventoryIndex }] : [];
  });
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
      <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-2 text-xs text-purple-600">
        🏷️ 공간 아이템 물가: {pricePolicyLabel(klass, klass.currency)} · 구매 후 환불은 실제 구매가의 50%예요.
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
          companions={companions}
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
          {/* 👫🐾 함께 다니는 친구·애완동물 */}
          <div>
            <h4 className="text-gray-500 mb-2">
              👫🐾 친구 · 애완동물
              <span className="text-xs text-gray-300 ml-2">
                눌러서 함께 다니기 ON/OFF ({walking.length}/{MAX_WALKING})
              </span>
            </h4>
            {[...owned('friend'), ...owned('pet')].length ? (
              <div className="flex flex-wrap gap-2">
                {[...owned('friend'), ...owned('pet')].map((item) => {
                  const on = walking.includes(item.id);
                  return (
                    <button
                      key={`${item.id}-${item.inventoryIndex}`}
                      onClick={() => toggleWalking(item)}
                      className={`rounded-2xl border-2 p-2 text-center transition ${
                        on ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 opacity-60 hover:opacity-100'
                      }`}
                      style={{ width: 92 }}
                    >
                      <ItemThumb id={item.id} size={48} />
                      <div className="text-[11px] mt-0.5 leading-tight">{item.name}</div>
                      <div className={`text-[10px] ${on ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {on ? '🚶 함께 다니는 중' : '집에서 쉬는 중'}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                아직 친구가 없어요. 상점의 👫친구 · 🐾애완동물에서 데려오면 내 공간을 돌아다녀요!
              </p>
            )}
          </div>

          {[['room', '🛋️ 가구·소품'], ['garden', '🌳 정원'], ['class', '🏫 교실'], ['cafe', '☕ 카페'], ['light', '💡 조명']].map(([slot, label]) => (
            <div key={slot}>
              <h4 className="text-gray-500 mb-2">{label} <span className="text-xs text-gray-300">누르고 바닥을 클릭하면 배치돼요</span></h4>
              {owned(slot).length ? (
                <div className="flex flex-wrap gap-2">
                  {owned(slot).map((item) => {
                    const placedIn = SPACE_KEYS.find((sp) =>
                      Object.values(maps[sp]).some((p) => p.id === item.id));
                    const placedCount = SPACE_KEYS.reduce((count, sp) =>
                      count + Object.values(maps[sp]).filter((p) => p.id === item.id).length, 0);
                    const ownedCount = inventory.filter((id) => id === item.id).length;
                    return (
                      <button
                        key={`${item.id}-${item.inventoryIndex}`}
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
                          {placedIn ? `${SPACES.find(([s]) => s === placedIn)[1].slice(0, 3)} · ${placedCount}/${ownedCount}` : `보유 ${ownedCount}개`}
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
                      key={`${item.id}-${item.inventoryIndex}`}
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
          <div className="border-t border-dashed border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-gray-500">♻️ 아이템 환불</h4>
              <span className="text-xs text-gray-400">모든 내 공간 아이템은 구매가의 50%로 환불할 수 있어요.</span>
            </div>
            {inventoryItems.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {inventoryItems.map((item) => (
                  <div key={`${item.id}-${item.inventoryIndex}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-2 flex items-center gap-2">
                    <ItemThumb id={item.id} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] truncate">{item.name}</div>
                      <div className="text-[10px] text-emerald-600">+{fmt(Math.floor(costOf(item) * 0.5))} {klass.currency}</div>
                      <button onClick={() => refundItem(item)} className="text-[10px] text-rose-500 underline">환불하기</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-300">아직 환불할 아이템이 없어요.</p>
            )}
          </div>
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
                      key={`${item.id}-${item.inventoryIndex}`}
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

      {previewItem && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setPreviewItem(null)}>
          <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm text-gray-400">캐릭터 3D 미리보기</div>
            <ItemThumb id={previewItem.id} size={190} />
            <h3 className="text-2xl text-purple-600">{previewItem.name}</h3>
            <p className="text-sm text-gray-500">구매하면 내 캐릭터로 선택해서 사용할 수 있어요.</p>
            <div className="text-amber-600">총 {fmt(costOf(previewItem) + taxForPart(costOf(previewItem), klass, 'item').tax)} {klass.currency}</div>
            <div className="flex gap-2">
              {!inventory.includes(previewItem.id) && (
                <button onClick={() => { setPreviewItem(null); buyItem(previewItem); }} className="flex-1 rounded-xl py-2 bg-purple-500 text-white">구매하기</button>
              )}
              <button onClick={() => setPreviewItem(null)} className="flex-1 rounded-xl py-2 bg-gray-100 text-gray-500">닫기</button>
            </div>
          </div>
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
                const { need, full, price, saved } = setPriceFor(set, inventory);
                const tax = taxForPart(price, klass, 'item').tax;
                const total = price + tax;
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
                        className={`w-full rounded-xl py-2 text-white ${student.cash >= total ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-300'}`}
                      >
                        {fmt(total)} {klass.currency}
                        {tax > 0 && <span className="text-xs opacity-80 ml-1">(세금 {fmt(tax)})</span>}
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
                    const price = costOf(c);
                    const tax = taxForPart(price, klass, 'item').tax;
                    const total = price + tax;
                    return (
                      <div key={c.id} className={`bg-white rounded-2xl shadow p-3 text-center ${has ? 'opacity-70' : ''}`}>
                        <ItemThumb id={c.id} size={64} />
                        <div className="text-sm leading-tight mt-1">{c.name}</div>
                        {has ? (
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => setPreviewItem(c)} className="flex-1 rounded-xl py-1.5 text-[11px] bg-sky-100 text-sky-600">자세히 보기</button>
                            <button
                              onClick={() => equipChar(c.base)}
                              className={`flex-1 rounded-xl py-1.5 text-[11px] ${
                                avatar.base === c.base ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'
                              }`}
                            >
                              {avatar.base === c.base ? '사용 중 ✓' : '바꾸기'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => setPreviewItem(c)} className="flex-1 rounded-xl py-1.5 text-[11px] bg-sky-100 text-sky-600">자세히 보기</button>
                            <button
                              onClick={() => buyItem(c)}
                              className={`flex-1 rounded-xl py-1.5 text-[11px] text-white ${
                                student.cash >= total ? 'bg-purple-400 hover:bg-purple-500' : 'bg-gray-300'
                              }`}
                            >
                              🔒 {fmt(total)}
                            </button>
                          </div>
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
                const stackable = isStackableRoomItem(item.slot);
                const ownedCount = inventory.filter((id) => id === item.id).length;
                const price = costOf(item);
                const tax = taxForPart(price, klass, 'item').tax;
                const total = price + tax;
                return (
                  <div key={item.id} className={`bg-white rounded-2xl shadow p-3 text-center ${has && !stackable ? 'opacity-60' : ''}`}>
                    <ItemThumb id={item.id} size={56} />
                    <div className="text-sm leading-tight mt-1">{item.name}</div>
                    <div className="text-[10px] text-gray-400 mb-1.5">{SLOT_LABEL[item.slot]}</div>
                    {has && !stackable ? (
                      <div className="text-emerald-500 text-sm">보유 중 ✓</div>
                    ) : (
                      <button
                        onClick={() => buyItem(item)}
                        className={`w-full rounded-xl py-1.5 text-sm text-white ${
                          student.cash >= total ? 'bg-purple-400 hover:bg-purple-500' : 'bg-gray-300'
                        }`}
                      >
                        {stackable && has ? `＋ 하나 더 구매 (${ownedCount}개 보유)` : `${fmt(total)} ${klass.currency}`}
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
