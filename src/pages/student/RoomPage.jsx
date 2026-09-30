import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, updateDoc, runTransaction, increment, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';
import { fmt } from '../../lib/util';
import {
  SPECIES_GROUP, CHAR_ITEMS, FRIEND_ITEMS, isCompanion,
  ITEMS, ITEM_MAP, SLOT_LABEL, SETS,
  normalizeRoom, canPlaceAt, isStackableRoomItem, ROOM_COLS, ROOM_ROWS,
} from '../../lib/items';
import RoomScene from '../../three/RoomScene.jsx';
import { ThumbProvider, ItemThumb } from '../../three/Thumbs.jsx';
import { itemPrice, pricePolicyLabel } from '../../lib/pricing';
import { TAX_LEDGER_ID, taxForPart } from '../../lib/taxes';
import {
  SPACE_TABS, SPACE_UNLOCK_PRICE, spaceConfig, isSpaceUnlocked,
} from '../../lib/spaces';
import { spaceBackdropFor } from '../../lib/spaceBackdrops';

const SPACES = SPACE_TABS.map(({ id, icon, label }) => [id, `${icon} ${label}`]);
const SPACE_KEYS = SPACE_TABS.map(({ id }) => id);

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

// 공간 머리말에 보여 줄 한 줄 소개(기본 공간 기준, 넓은 공간도 같은 소개를 씁니다)
const SPACE_DESC = {
  room: '좋아하는 가구와 소품으로 나만의 방을 꾸며요.',
  garden: '나무·꽃·놀이기구로 싱그러운 정원을 가꿔요.',
  classroom: '책상과 칠판을 놓아 우리만의 교실을 만들어요.',
  cafe: '테이블과 조명으로 아늑한 카페를 열어요.',
};

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
  const [spaceBusy, setSpaceBusy] = useState(null);
  const [purchaseBusy, setPurchaseBusy] = useState(null);
  const [placementBusy, setPlacementBusy] = useState(false);
  const [refundBusy, setRefundBusy] = useState(null);
  const purchaseBusyRef = useRef(false);
  const placementBusyRef = useRef(false);
  const refundBusyRef = useRef(false);
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
  const maps = Object.fromEntries(SPACE_TABS.map(({ id, mapField }) => [id, normalizeRoom(student[mapField])]));
  const activeMap = maps[space] || {};
  const activeSpace = spaceConfig(space);
  const grid = activeSpace.wide
    ? { cols: ROOM_COLS * 2, rows: ROOM_ROWS * 2 }
    : { cols: ROOM_COLS, rows: ROOM_ROWS };
  const skin = student.roomSkin || {};

  // 인증샷에 쓸 공간 배경 이미지를 미리 불러 둡니다(같은 출처라 캔버스에 그려도 저장할 수 있어요).
  const backdropRef = useRef(null);
  useEffect(() => {
    const image = new Image();
    image.src = spaceBackdropFor(activeSpace.baseId);
    backdropRef.current = image;
  }, [activeSpace.baseId]);

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

  const selectSpace = (entry) => {
    if (spaceBusy) return;
    if (entry.wide && !isSpaceUnlocked(student, entry.id)) {
      purchaseSpace(entry);
      return;
    }
    setSpace(entry.id);
    setPlacing(null);
    setSelected(null);
  };

  const purchaseSpace = async (entry) => {
    if (!entry.wide || isSpaceUnlocked(student, entry.id) || spaceBusy) return;
    const previewPrice = itemPrice(entry.unlockPrice || SPACE_UNLOCK_PRICE, klass);
    const previewTax = taxForPart(previewPrice, klass, 'item').tax;
    const previewTotal = previewPrice + previewTax;
    if (!confirm(`'${entry.label}'을(를) 열까요?\n공간 가격 ${fmt(previewPrice)} + 세금 ${fmt(previewTax)} = 총 ${fmt(previewTotal)}${klass.currency}`)) return;
    setSpaceBusy(entry.id);
    try {
      await runTransaction(db, async (tx) => {
        const studentSnap = await tx.get(studentRef);
        const classSnap = await tx.get(classRef);
        const current = studentSnap.data() || {};
        const settings = { ...klass, ...(classSnap.data() || {}) };
        if (isSpaceUnlocked(current, entry.id)) throw new Error('이미 열려 있는 공간이에요.');
        const price = itemPrice(entry.unlockPrice || SPACE_UNLOCK_PRICE, settings);
        const tax = taxForPart(price, settings, 'item').tax;
        const total = price + tax;
        if ((Number(current.cash) || 0) < total) throw new Error('현금이 부족해요.');
        tx.update(studentRef, {
          cash: (Number(current.cash) || 0) - total,
          [`spaceUnlocks.${entry.id}`]: true,
        });
        if (tax > 0) {
          tx.set(ledgerRef, {
            pending: increment(tax),
            item: increment(tax),
            updatedAt: Date.now(),
          }, { merge: true });
        }
      });
      setSpace(entry.id);
      setPlacing(null);
      setSelected(null);
      flash('ok', `🔓 ${entry.label}을(를) 열었어요! 이제 ${fmt(previewTotal)}${klass.currency}가 사용됐어요.`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setSpaceBusy(null);
    }
  };

  /* ----- 구매 ----- */
  const buyItem = async (item) => {
    if (purchaseBusyRef.current) return;
    const stackable = isStackableRoomItem(item.slot);
    if (inventory.includes(item.id) && !stackable) return;
    const price = costOf(item);
    const previewTax = taxForPart(price, klass, 'item').tax;
    const previewTotal = price + previewTax;
    if (!confirm(`'${item.name}'을(를) 살까요?\n상품가 ${fmt(price)} + 세금 ${fmt(previewTax)} = 총 ${fmt(previewTotal)}${klass.currency}`)) return;
    purchaseBusyRef.current = true;
    setPurchaseBusy(item.id);
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
    } finally {
      purchaseBusyRef.current = false;
      setPurchaseBusy(null);
    }
  };

  /* ----- 세트 구매 ----- */
  const buySet = async (set) => {
    if (purchaseBusyRef.current) return;
    const { need, full, price, saved } = setPriceFor(set, inventory);
    if (!need.length) return flash('err', '이미 세트를 다 가지고 있어요!');
    const previewTax = taxForPart(price, klass, 'item').tax;
    const previewTotal = price + previewTax;
    if (!confirm(`${set.name}\n${need.length}개 아이템을 살까요?\n상품가 ${fmt(price)} + 세금 ${fmt(previewTax)} = 총 ${fmt(previewTotal)}${klass.currency}\n(따로 사면 ${fmt(full)} → ${fmt(saved)} 절약!)`)) return;
    purchaseBusyRef.current = true;
    setPurchaseBusy(set.id);
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
    } finally {
      purchaseBusyRef.current = false;
      setPurchaseBusy(null);
    }
  };

  /* ----- 배치 ----- */
  const onPlace = async (key) => {
    if (placementBusyRef.current) return;
    const item = ITEM_MAP[placing];
    if (!item) return;
    placementBusyRef.current = true;
    setPlacementBusy(true);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(studentRef);
        const current = snap.data() || {};
        const currentInventory = Array.isArray(current.inventory) ? current.inventory : [];
        const placedCount = SPACE_KEYS.reduce((count, sp) =>
          count + Object.values(normalizeRoom(current[sp])).filter((placed) => placed.id === placing).length, 0);
        const ownedCount = currentInventory.filter((id) => id === placing).length;
        if (placedCount >= ownedCount) {
          throw new Error('가지고 있는 수량만큼 모두 배치했어요. 기존 배치를 먼저 집어 주세요.');
        }
        const currentMap = normalizeRoom(current[space]);
        if (!canPlaceAt(currentMap, key, item, 0, null, grid.cols, grid.rows)) {
          throw new Error('거기엔 놓을 수 없어요! (공간이 부족해요)');
        }
        tx.update(studentRef, { [`${space}.${key}`]: { id: placing, rot: 0 } });
      });
      setPlacing(null);
    } catch (e) {
      flash('err', e.message);
    } finally {
      placementBusyRef.current = false;
      setPlacementBusy(false);
    }
  };

  const rotateSelected = async () => {
    const pl = activeMap[selected];
    if (!pl) return;
    const item = ITEM_MAP[pl.id];
    const newRot = ((pl.rot || 0) + 1) % 4;
    if (!canPlaceAt(activeMap, selected, item, newRot, selected, grid.cols, grid.rows)) {
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
    const currentBase = spaceConfig(space).baseId;
    const slotDest = SLOT_SPACE[item.slot];
    const dest = item.slot === 'room' && currentBase !== 'room'
      ? 'room'
      : slotDest
        ? (currentBase === slotDest ? space : slotDest)
        : space; // 조명은 지금 공간에 그대로
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
    if (refundBusyRef.current) return;
    const previewRefund = Math.floor(costOf(item) * 0.5);
    if (!confirm(`'${item.name}'을(를) 구매가의 50%인 ${fmt(previewRefund)}${klass.currency}에 환불할까요?`)) return;
    refundBusyRef.current = true;
    setRefundBusy(`${item.id}:${item.inventoryIndex}`);
    try {
      let refundPrice = previewRefund;
      await runTransaction(db, async (tx) => {
        const studentSnap = await tx.get(studentRef);
        const classSnap = await tx.get(classRef);
        const s = studentSnap.data() || {};
        const settings = { ...klass, ...(classSnap.data() || {}) };
        const catalogItem = ITEM_MAP[item.id] || item;
        refundPrice = Math.floor(itemPrice(catalogItem.price, settings) * 0.5);
        const inv = [...(s.inventory || [])];
        const inventoryIndex = Number.isInteger(item.inventoryIndex) && inv[item.inventoryIndex] === item.id
          ? item.inventoryIndex
          : inv.indexOf(item.id);
        if (inventoryIndex < 0) throw new Error('환불할 아이템을 찾지 못했어요.');
        inv.splice(inventoryIndex, 1);
        const upd = {
          cash: (Number(s.cash) || 0) + refundPrice,
          inventory: inv,
        };

        for (const sp of SPACE_KEYS) {
          const map = normalizeRoom(s[sp]);
          const placedKeys = Object.keys(map).filter((key) => map[key].id === item.id);
          if (!placedKeys.length) continue;
          // One inventory entry can represent one placement. If older rapid
          // clicks already created ghost placements, remove the excess too so
          // a refund can never leave an item that is no longer owned.
          const remainingCopies = inv.filter((id) => id === item.id).length;
          const excess = Math.max(0, placedKeys.length - remainingCopies);
          if (excess > 0) {
            // 중첩 deleteField에 의존하지 않고 공간 맵 전체를 다시 저장해요.
            // 운영 API가 점 표기법 삭제를 놓쳐도 환불한 물건이 공간에 남지 않습니다.
            const nextMap = { ...(s[sp] && typeof s[sp] === 'object' ? s[sp] : {}) };
            placedKeys.slice(0, excess).forEach((key) => delete nextMap[key]);
            upd[sp] = nextMap;
          }
        }
        if (isCompanion(item.slot)) {
          const nextWalking = Array.isArray(s.walking) ? s.walking.filter((id) => id !== item.id) : [];
          upd.walking = nextWalking;
        }
        const nextAvatar = { ...(s.avatar && typeof s.avatar === 'object' ? s.avatar : {}) };
        let avatarChanged = false;
        if (item.slot === 'char' && nextAvatar.base === item.base) {
          delete nextAvatar.base;
          avatarChanged = true;
        }
        if (nextAvatar[item.slot] === item.id) {
          delete nextAvatar[item.slot];
          avatarChanged = true;
        }
        if (avatarChanged) upd.avatar = nextAvatar;

        const nextRoomSkin = { ...(s.roomSkin && typeof s.roomSkin === 'object' ? s.roomSkin : {}) };
        if (nextRoomSkin[item.slot] === item.id) {
          delete nextRoomSkin[item.slot];
          upd.roomSkin = nextRoomSkin;
        }
        tx.update(studentRef, upd);
      });
      setSelected(null);
      setPlacing(null);
      flash('ok', `♻️ '${item.name}' 환불 완료! 구매가의 50%를 돌려받았어요.`);
    } catch (e) {
      flash('err', e.message);
    } finally {
      refundBusyRef.current = false;
      setRefundBusy(null);
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
    // 화면처럼 공간 일러스트 배경을 먼저 깔고(가득 채우기) 그 위에 3D 장면을 그립니다.
    const backdrop = backdropRef.current;
    if (backdrop?.complete && backdrop.naturalWidth) {
      const scale = Math.max(src.width / backdrop.naturalWidth, src.height / backdrop.naturalHeight);
      const w = backdrop.naturalWidth * scale;
      const h = backdrop.naturalHeight * scale;
      c.save();
      c.beginPath();
      c.rect(0, 70, src.width, src.height);
      c.clip();
      c.drawImage(backdrop, (src.width - w) / 2, 70 + (src.height - h) / 2, w, h);
      c.restore();
    }
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
  const spaceLabel = SPACES.find(([id]) => id === space)?.[1] || '🛋️ 내 방';

  return (
    <div className="room-page space-y-4">
      {/* 상단: 지금 꾸미는 공간 소개 + 한눈에 보는 현황 */}
      <section className={`room-hero room-hero-${activeSpace.baseId}${activeSpace.wide ? ' room-hero-wide' : ''}`}>
        <div className="room-hero-main">
          <span className="room-hero-kicker">{activeSpace.wide ? 'WIDE SPACE' : 'MY SPACE'}</span>
          <h2 className="room-hero-title">{spaceLabel}</h2>
          <p className="room-hero-desc">{SPACE_DESC[activeSpace.baseId]}{activeSpace.wide ? ' 넓은 공간이라 더 많이 놓을 수 있어요.' : ''}</p>
        </div>
        <div className="room-hero-stats">
          <div className="room-hero-stat"><span>배치한 물건</span><b>{Object.keys(activeMap).length}</b></div>
          <div className="room-hero-stat"><span>함께 다니는 친구</span><b>{companions.length}<em>/{MAX_WALKING}</em></b></div>
          <div className="room-hero-stat"><span>열린 공간</span><b>{SPACE_TABS.filter((entry) => isSpaceUnlocked(student, entry.id)).length}<em>/{SPACE_TABS.length}</em></b></div>
        </div>
        <button type="button" onClick={screenshot} className="room-hero-shot">📸 인증샷</button>
      </section>

      <nav className="room-space-tabs" aria-label="공간 선택">
        {SPACE_TABS.map((entry) => {
          const unlocked = isSpaceUnlocked(student, entry.id);
          const unlockPrice = itemPrice(entry.unlockPrice || SPACE_UNLOCK_PRICE, klass);
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => selectSpace(entry)}
              disabled={spaceBusy === entry.id}
              title={entry.wide && !unlocked ? `${fmt(unlockPrice)}${klass.currency}에 잠금 해제` : entry.label}
              aria-pressed={space === entry.id}
              className={`room-space-tab${space === entry.id ? ' is-active' : ''}${unlocked ? '' : ' is-locked'}`}
            >
              <span className="room-space-tab-icon" aria-hidden="true">{unlocked ? entry.icon : '🔒'}</span>
              <span className="room-space-tab-label">{entry.label}</span>
              {!unlocked && <small>{fmt(unlockPrice)}{klass.currency}</small>}
            </button>
          );
        })}
      </nav>
      <p className="room-price-note">
        🏷️ 공간 아이템 물가: {pricePolicyLabel(klass, klass.currency)} · 구매 후 환불은 실제 구매가의 50%예요.
      </p>

      {msg && (
        <div className={`rounded-2xl px-4 py-3 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {msg.text}
        </div>
      )}

      {/* 3D 공간 */}
      <div className="room-stage">
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
          <div className="room-stage-hint" role="status">
            <span>'{ITEM_MAP[placing]?.name}' 놓을 곳을 바닥에서 눌러 주세요</span>
            <button type="button" onClick={() => setPlacing(null)}>취소</button>
          </div>
        )}
        {selectedItem && !placing && (
          <div className="room-stage-toolbar">
            <span className="room-stage-toolbar-name">{selectedItem.name}</span>
            <button type="button" onClick={rotateSelected} className="room-stage-btn room-stage-btn-rotate">🔄 회전</button>
            <button type="button" onClick={pickupSelected} className="room-stage-btn room-stage-btn-pickup">📦 회수</button>
            <button type="button" onClick={() => setSelected(null)} className="room-stage-btn-close" aria-label="선택 해제">✕</button>
          </div>
        )}
        {!placing && !selectedItem && (
          <div className="room-stage-help" aria-hidden="true">드래그해서 돌려 보고, 바닥을 누르면 캐릭터가 걸어가요</div>
        )}
      </div>

      {/* 탭 */}
      <div className="room-tabs" role="tablist" aria-label="공간 꾸미기 메뉴">
        {[['inv', '📦 인벤토리'], ['avatar', '🐰 캐릭터'], ['shop', '🛍️ 상점']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => { setTab(id); setPlacing(null); setSelected(null); }}
            className={`room-tab${tab === id ? ' is-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 인벤토리 */}
      {tab === 'inv' && (
        <div className="room-panel">
          {/* 👫🐾 함께 다니는 친구·애완동물 */}
          <section className="room-section">
            <div className="room-section-head">
              <h4>👫🐾 친구 · 애완동물</h4>
              <span>눌러서 함께 다니기 켜고 끄기 · {walking.length}/{MAX_WALKING}</span>
            </div>
            {[...owned('friend'), ...owned('pet')].length ? (
              <div className="room-tile-grid">
                {[...owned('friend'), ...owned('pet')].map((item) => {
                  const on = walking.includes(item.id);
                  return (
                    <button
                      key={`${item.id}-${item.inventoryIndex}`}
                      type="button"
                      onClick={() => toggleWalking(item)}
                      aria-pressed={on}
                      className={`room-tile${on ? ' is-on' : ' is-off'}`}
                    >
                      <ItemThumb id={item.id} size={56} />
                      <span className="room-tile-name">{item.name}</span>
                      <span className="room-tile-badge">{on ? '🚶 함께 다니는 중' : '집에서 쉬는 중'}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="room-empty">아직 친구가 없어요. 상점의 👫친구 · 🐾애완동물에서 데려오면 내 공간을 돌아다녀요!</p>
            )}
          </section>

          {[['room', '🛋️ 가구·소품'], ['garden', '🌳 정원'], ['class', '🏫 교실'], ['cafe', '☕ 카페'], ['light', '💡 조명']].map(([slot, label]) => (
            <section key={slot} className="room-section">
              <div className="room-section-head">
                <h4>{label}</h4>
                <span>누른 다음 바닥을 누르면 배치돼요</span>
              </div>
              {owned(slot).length ? (
                <div className="room-tile-grid">
                  {owned(slot).map((item) => {
                    const placedIn = SPACE_KEYS.find((sp) =>
                      Object.values(maps[sp]).some((p) => p.id === item.id));
                    const placedCount = SPACE_KEYS.reduce((count, sp) =>
                      count + Object.values(maps[sp]).filter((p) => p.id === item.id).length, 0);
                    const ownedCount = inventory.filter((id) => id === item.id).length;
                    return (
                      <button
                        key={`${item.id}-${item.inventoryIndex}`}
                        type="button"
                        onClick={() => startPlacing(item)}
                        className={`room-tile${placing === item.id ? ' is-placing' : placedIn ? ' is-placed' : ''}`}
                      >
                        <ItemThumb id={item.id} size={56} />
                        <span className="room-tile-name">{item.name}</span>
                        <span className="room-tile-badge">
                          {placedIn ? `${SPACES.find(([s]) => s === placedIn)[1].slice(0, 3)} · ${placedCount}/${ownedCount}` : `보유 ${ownedCount}개`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="room-empty">아직 없어요. 상점에서 사 보세요!</p>
              )}
            </section>
          ))}
          {['wall', 'floor'].map((slot) => (
            <section key={slot} className="room-section">
              <div className="room-section-head">
                <h4>{SLOT_LABEL[slot]}</h4>
                <span>내 방에 적용돼요</span>
              </div>
              {owned(slot).length ? (
                <div className="flex flex-wrap gap-2">
                  {owned(slot).map((item) => (
                    <button
                      key={`${item.id}-${item.inventoryIndex}`}
                      type="button"
                      onClick={() => applySkin(item)}
                      aria-pressed={skin[slot] === item.id}
                      className={`room-skin-chip${skin[slot] === item.id ? ' is-active' : ''}`}
                    >
                      <span className="room-skin-swatch" style={{ background: item.colors.b ? `linear-gradient(135deg, ${item.colors.a} 50%, ${item.colors.b} 50%)` : item.colors.a }} />
                      <span>{item.name}</span>
                      {skin[slot] === item.id && <em>적용 중</em>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="room-empty">상점에서 사면 방 분위기를 바꿀 수 있어요!</p>
              )}
            </section>
          ))}
          <section className="room-section room-section-refund">
            <div className="room-section-head">
              <h4>♻️ 아이템 환불</h4>
              <span>모든 내 공간 아이템은 구매가의 50%로 환불할 수 있어요.</span>
            </div>
            {inventoryItems.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {inventoryItems.map((item) => (
                  <div key={`${item.id}-${item.inventoryIndex}`} className="room-refund-card">
                    <ItemThumb id={item.id} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="room-refund-name">{item.name}</div>
                      <div className="room-refund-price">+{fmt(Math.floor(costOf(item) * 0.5))} {klass.currency}</div>
                      <button type="button" onClick={() => refundItem(item)} disabled={Boolean(refundBusy)} className="room-refund-btn">
                        {refundBusy === `${item.id}:${item.inventoryIndex}` ? '처리 중...' : '환불하기'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="room-empty">아직 환불할 아이템이 없어요.</p>
            )}
          </section>
        </div>
      )}

      {/* 캐릭터 */}
      {tab === 'avatar' && (
        <div className="room-panel">
          <section className="room-section">
            <div className="room-section-head">
              <h4>내 캐릭터 ({myChars.length}/{CHAR_ITEMS.length}종)</h4>
              <span>상점에서 산 캐릭터는 언제든 바꿔 가며 놀 수 있어요.</span>
            </div>
            {myChars.length ? (
              <div className="room-tile-grid">
                {myChars.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => equipChar(c.base)}
                    aria-pressed={avatar.base === c.base}
                    className={`room-tile${avatar.base === c.base ? ' is-placing' : ''}`}
                  >
                    <ItemThumb id={c.id} size={60} />
                    <span className="room-tile-name">{c.name}</span>
                    {avatar.base === c.base && <span className="room-tile-badge">사용 중</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="room-callout">
                아직 캐릭터가 없어요! 🛍️ 상점 → 🐰 캐릭터에서 마음에 드는 친구를 데려오세요.
              </div>
            )}
          </section>
          {['hat', 'face', 'acc'].map((slot) => (
            <section key={slot} className="room-section">
              <div className="room-section-head"><h4>{SLOT_LABEL[slot]}</h4></div>
              {owned(slot).length ? (
                <div className="room-tile-grid room-tile-grid-sm">
                  {owned(slot).map((item) => (
                    <button
                      key={`${item.id}-${item.inventoryIndex}`}
                      type="button"
                      onClick={() => equip(item)}
                      title={item.name}
                      aria-pressed={avatar[slot] === item.id}
                      className={`room-tile${avatar[slot] === item.id ? ' is-placing' : ''}`}
                    >
                      <ItemThumb id={item.id} size={48} />
                      <span className="room-tile-name">{item.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="room-empty">아직 없는 종류예요. 상점에서 사 보세요!</p>
              )}
            </section>
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
                <button onClick={() => { setPreviewItem(null); buyItem(previewItem); }} disabled={Boolean(purchaseBusy)} className="flex-1 rounded-xl py-2 bg-purple-500 text-white disabled:opacity-40">구매하기</button>
              )}
              <button onClick={() => setPreviewItem(null)} className="flex-1 rounded-xl py-2 bg-gray-100 text-gray-500">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 상점 */}
      {tab === 'shop' && (
        <div className="space-y-3">
          <div className="room-cat-chips">
            {CATS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setShopCat(id)}
                aria-pressed={shopCat === id}
                className={`room-cat-chip${shopCat === id ? ' is-active' : ''}`}
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
                  <div key={set.id} className={`room-shop-card room-set-card${done ? ' is-owned' : ''}`}>
                    <h4 className="room-set-title">{set.name}</h4>
                    <p className="room-set-desc">{set.desc}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {set.items.map((id) => ITEM_MAP[id] && (
                        <div key={id} className="text-center" style={{ width: 58 }}>
                          <ItemThumb id={id} size={42} />
                          <div className="room-set-item-name">{ITEM_MAP[id].name}</div>
                        </div>
                      ))}
                    </div>
                    {done ? (
                      <div className="room-owned-mark">세트 완성! ✓</div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => buySet(set)}
                        disabled={Boolean(purchaseBusy)}
                        className={`room-buy-btn${student.cash >= total ? '' : ' is-short'}`}
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
                <h4 className="room-shop-group">{gLabel}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
                  {CHAR_ITEMS.filter((c) => c.group === g).map((c) => {
                    const has = inventory.includes(c.id);
                    const price = costOf(c);
                    const tax = taxForPart(price, klass, 'item').tax;
                    const total = price + tax;
                    return (
                      <div key={c.id} className={`room-shop-card${has ? ' is-owned' : ''}`}>
                        <ItemThumb id={c.id} size={68} />
                        <div className="room-shop-name">{c.name}</div>
                        {has ? (
                          <div className="flex gap-1 mt-2">
                            <button type="button" onClick={() => setPreviewItem(c)} className="room-mini-btn room-mini-btn-info">자세히 보기</button>
                            <button
                              type="button"
                              onClick={() => equipChar(c.base)}
                              className={`room-mini-btn ${avatar.base === c.base ? 'room-mini-btn-using' : 'room-mini-btn-switch'}`}
                            >
                              {avatar.base === c.base ? '사용 중 ✓' : '바꾸기'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 mt-2">
                            <button type="button" onClick={() => setPreviewItem(c)} className="room-mini-btn room-mini-btn-info">자세히 보기</button>
                            <button
                              type="button"
                              onClick={() => buyItem(c)}
                              disabled={Boolean(purchaseBusy)}
                              className={`room-mini-btn room-mini-btn-buy${student.cash >= total ? '' : ' is-short'}`}
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
                  <div key={item.id} className={`room-shop-card${has && !stackable ? ' is-owned' : ''}`}>
                    <ItemThumb id={item.id} size={60} />
                    <div className="room-shop-name">{item.name}</div>
                    <div className="room-shop-slot">{SLOT_LABEL[item.slot]}</div>
                    {has && !stackable ? (
                      <div className="room-owned-mark">보유 중 ✓</div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => buyItem(item)}
                        disabled={Boolean(purchaseBusy)}
                        className={`room-buy-btn${student.cash >= total ? '' : ' is-short'}`}
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
