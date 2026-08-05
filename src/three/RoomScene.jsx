import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { B, Sp, Cy, Co } from './prims.jsx';
import { FurnitureModel, PET_MODELS, FLYING_PETS } from './models.jsx';
import { Walker, Wanderer, Character } from './Character3D.jsx';
import {
  ITEM_MAP, ROOM_COLS as COLS, ROOM_ROWS as ROWS,
  footprintOf, canPlaceAt, DEFAULT_WALL, DEFAULT_FLOOR, GARDEN_FLOOR,
  CLASS_FLOOR, CAFE_FLOOR, LIGHT_SPEC,
} from '../lib/items';
import { isWideSpace, spaceConfig } from '../lib/spaces';

function Shell({ wall, floors, cols = COLS, rows = ROWS, wide = false }) {
  const cx = (c) => c - cols / 2;
  const cz = (r) => r - rows / 2;
  const [fa, fb] = floors;
  return (
    <group>
      {/* 바닥 타일 */}
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[cx(c) + 0.5, 0, cz(r) + 0.5]} receiveShadow>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={(r + c) % 2 ? fa : fb} roughness={0.85} />
          </mesh>
        );
      })}
      {/* 뒷벽 + 왼벽 */}
      <B p={[0, 1.5, cz(0) - 0.1]} s={[cols + 0.4, 3, 0.2]} c={wall} />
      <B p={[cx(0) - 0.1, 1.5, 0]} s={[0.2, 3, rows + 0.4]} c={wall} />
      {/* 걸레받이 */}
      <B p={[0, 0.09, cz(0) + 0.015]} s={[cols, 0.18, 0.05]} c="#ffffff" />
      <B p={[cx(0) + 0.015, 0.09, 0]} s={[0.05, 0.18, rows]} c="#ffffff" />
      {/* 창문 (뒷벽) */}
      <group position={[1.2, 1.7, cz(0) + 0.02]}>
        <B p={[0, 0, 0]} s={[1.7, 1.15, 0.08]} c="#ffffff" />
        <B p={[0, 0, 0.03]} s={[1.5, 0.95, 0.05]} c="#aee3fb" e="#8fd0f0" />
        <B p={[0, 0, 0.07]} s={[0.05, 0.95, 0.02]} c="#ffffff" />
        <B p={[0, 0, 0.07]} s={[1.5, 0.05, 0.02]} c="#ffffff" />
        <Sp p={[-0.45, 0.28, 0.08]} rad={0.11} c="#fde047" e="#fde68a" />
      </group>
      {/* 왼벽 액자 */}
      <group position={[cx(0) + 0.12, 1.8, -0.6]}>
        <B p={[0, 0, 0]} s={[0.06, 0.55, 0.75]} c="#b5834f" />
        <B p={[0.02, 0, 0]} s={[0.05, 0.42, 0.62]} c="#fef3c7" />
        <Sp p={[0.05, 0.03, 0.1]} rad={0.09} sc={[0.3, 1, 1.6]} c="#86efac" />
        <Sp p={[0.05, 0.1, -0.15]} rad={0.06} sc={[0.3, 1, 1]} c="#fdba74" />
      </group>
      {wide && (
        <group position={[2.8, 0.025, 1.9]}>
          <B p={[0, 0, 0]} s={[3.2, 0.025, 2.1]} c="#c4b5fd" />
          <B p={[0, 0.015, 0]} s={[2.7, 0.03, 1.6]} c="#ddd6fe" />
          <Sp p={[-1.1, 0.1, -0.6]} rad={0.09} c="#f472b6" />
          <Sp p={[1.1, 0.1, 0.6]} rad={0.09} c="#60a5fa" />
        </group>
      )}
    </group>
  );
}

function GardenShell({ cols = COLS, rows = ROWS, wide = false }) {
  const cx = (c) => c - cols / 2;
  const cz = (r) => r - rows / 2;
  const [fa, fb] = GARDEN_FLOOR;
  const posts = [];
  for (let c = 0; c <= cols; c++) {
    posts.push([cx(c), cz(0)], [cx(c), cz(rows)]);
  }
  for (let r = 1; r < rows; r++) {
    posts.push([cx(0), cz(r)], [cx(cols), cz(r)]);
  }
  return (
    <group>
      {/* 잔디 타일 */}
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[cx(c) + 0.5, 0, cz(r) + 0.5]} receiveShadow>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={(r + c) % 2 ? fa : fb} roughness={0.95} />
          </mesh>
        );
      })}
      {/* 흙 테두리 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[cols + 1.6, rows + 1.6]} />
        <meshStandardMaterial color="#c9a468" roughness={1} />
      </mesh>
      {/* 하얀 울타리 */}
      {posts.map(([x, z], i) => (
        <B key={i} p={[x, 0.3, z]} s={[0.09, 0.6, 0.09]} c="#ffffff" />
      ))}
      <B p={[0, 0.42, cz(0)]} s={[cols, 0.07, 0.05]} c="#ffffff" />
      <B p={[0, 0.42, cz(rows)]} s={[cols, 0.07, 0.05]} c="#ffffff" />
      <B p={[cx(0), 0.42, 0]} s={[0.05, 0.07, rows]} c="#ffffff" />
      <B p={[cx(cols), 0.42, 0]} s={[0.05, 0.07, rows]} c="#ffffff" />
      {/* 해 + 구름 */}
      <Sp p={[-4, 5.2, -4]} rad={0.55} c="#fde047" e="#fde047" />
      <group position={[2.5, 4.6, -3.5]}>
        <Sp p={[0, 0, 0]} rad={0.4} sc={[1.6, 0.8, 0.9]} c="#ffffff" />
        <Sp p={[0.5, 0.1, 0]} rad={0.3} c="#ffffff" />
      </group>
      <group position={[-2.8, 4.1, 2]}>
        <Sp p={[0, 0, 0]} rad={0.3} sc={[1.7, 0.7, 0.9]} c="#ffffff" />
      </group>
      {wide && (
        <group position={[4.6, 0.05, 3.6]}>
          <Sp p={[0, 0.35, 0]} rad={0.32} sc={[0.8, 1.5, 0.8]} c="#7c5a3c" />
          <Sp p={[-0.22, 0.85, 0]} rad={0.48} sc={[1.3, 0.65, 1.1]} c="#34d399" />
          <Sp p={[0.22, 1.05, 0.05]} rad={0.42} sc={[1.2, 0.65, 1]} c="#4ade80" />
          {[-0.55, 0.45].map((x) => <Sp key={x} p={[x, 0.08, 0.5]} rad={0.1} c="#f472b6" e="#f9a8d4" />)}
        </group>
      )}
    </group>
  );
}

/* 🏫 교실 — 앞 칠판·마루·창가·천장 형광등이 있는 진짜 교실 */
function ClassShell({ cols = COLS, rows = ROWS, wide = false }) {
  const cx = (c) => c - cols / 2;
  const cz = (r) => r - rows / 2;
  const [fa] = CLASS_FLOOR;
  return (
    <group>
      {/* 나무 마루 (긴 널판) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[cols, rows]} />
        <meshStandardMaterial color={fa} roughness={0.7} />
      </mesh>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <B key={`p${i}`} p={[cx(i), 0.004, 0]} s={[0.035, 0.008, rows]} c="#bd9868" />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <B key={`q${i}`} p={[cx(i * 2 + 1), 0.004, cz(i % 2 ? 2 : 4)]} s={[2, 0.008, 0.03]} c="#bd9868" />
      ))}

      {/* 교실 벽 (연한 미색) */}
      <B p={[0, 1.75, cz(0) - 0.1]} s={[cols + 0.4, 3.5, 0.2]} c="#f2ede2" />
      <B p={[cx(0) - 0.1, 1.75, 0]} s={[0.2, 3.5, rows + 0.4]} c="#f2ede2" />
      {/* 아래 나무 굽도리 + 허리 몰딩 */}
      <B p={[0, 0.2, cz(0) + 0.03]} s={[cols, 0.4, 0.07]} c="#c9a97e" />
      <B p={[cx(0) + 0.03, 0.2, 0]} s={[0.07, 0.4, rows]} c="#c9a97e" />
      <B p={[0, 0.95, cz(0) + 0.02]} s={[cols, 0.05, 0.05]} c="#dcd0bb" />

      {/* 칠판·게시판·시계·태극기는 상점 아이템으로 직접 놓아요 (기본 배치는 비워 둡니다) */}

      {/* ▶ 창가 — 왼쪽 벽 전체가 큰 창문 (교실 특유의 창가 줄) */}
      {[-2.0, -0.5, 1.0, 2.5].map((z) => (
        <group key={z} position={[cx(0) + 0.04, 1.75, z]}>
          <B p={[0, 0, 0]} s={[0.07, 1.9, 1.35]} c="#e8e2d5" />
          <B p={[0.03, 0, 0]} s={[0.04, 1.7, 1.15]} c="#cfeaf8" e="#b6dcf0" />
          <B p={[0.06, 0, 0]} s={[0.02, 1.7, 0.05]} c="#ffffff" />
          <B p={[0.06, 0.15, 0]} s={[0.02, 0.05, 1.15]} c="#ffffff" />
          <B p={[0.02, -1.0, 0]} s={[0.16, 0.08, 1.35]} c="#c9a97e" />
        </group>
      ))}

      {/* ▶ 천장 형광등 (교실 특유의 긴 등) — 시야를 가리지 않게 높고 얇게 */}
      {[-1.2, 1.6].map((z) => (
        <group key={z} position={[-0.5, 3.32, z]}>
          <B p={[0, 0, 0]} s={[3.6, 0.05, 0.2]} c="#dbe2ea" />
          <B p={[0, -0.04, 0]} s={[3.4, 0.03, 0.15]} c="#ffffff" e="#fffdf0" />
          {[-1.4, 1.4].map((x) => (
            <Cy key={x} p={[x, 0.09, 0]} rad={0.008} h={0.18} c="#94a3b8" />
          ))}
        </group>
      ))}

      {wide && (
        <group position={[3.8, 0.03, 2.8]}>
          <B p={[0, 0, 0]} s={[3.5, 0.04, 2.2]} c="#bfdbfe" />
          {[-1.2, 0, 1.2].map((x) => <B key={x} p={[x, 0.05, 0]} s={[0.9, 0.07, 1.7]} c="#fef3c7" />)}
        </group>
      )}

    </group>
  );
}

/* ☕ 카페 — 벽돌 벽, 어두운 원목 바닥, 펜던트 조명 */
function CafeShell({ cols = COLS, rows = ROWS, wide = false }) {
  const cx = (c) => c - cols / 2;
  const cz = (r) => r - rows / 2;
  const [fa, fb] = CAFE_FLOOR;
  return (
    <group>
      {/* 원목 바닥 (헤링본 느낌) */}
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[cx(c) + 0.5, 0, cz(r) + 0.5]} receiveShadow>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={(r + c) % 2 ? fa : fb} roughness={0.6} />
          </mesh>
        );
      })}
      {/* 벽돌 뒷벽 */}
      <B p={[0, 1.7, cz(0) - 0.12]} s={[cols + 0.4, 3.4, 0.24]} c="#8d5b45" />
      {Array.from({ length: 11 }, (_, row) =>
        Array.from({ length: 9 }, (_, col) => (
          <B
            key={`${row}-${col}`}
            p={[cx(0) + 0.5 + col * 0.95 + (row % 2 ? 0.45 : 0), 0.3 + row * 0.29, cz(0) + 0.02]}
            s={[0.86, 0.22, 0.04]}
            c={row % 3 === 0 ? '#9c6650' : row % 3 === 1 ? '#87553f' : '#a06e56'}
          />
        ))
      )}
      {/* 왼쪽 통유리 창 */}
      <B p={[cx(0) - 0.1, 1.7, 0]} s={[0.2, 3.4, rows + 0.4]} c="#5c4033" />
      {[-1.8, 0.3, 2.4].map((z) => (
        <group key={z} position={[cx(0) + 0.04, 1.5, z]}>
          <B p={[0, 0, 0]} s={[0.07, 2.3, 1.8]} c="#3f2d20" />
          <B p={[0.03, 0, 0]} s={[0.04, 2.1, 1.6]} c="#dbeafe" e="#bfdbfe" o={0.75} />
          <B p={[0.06, 0.2, 0]} s={[0.02, 0.06, 1.6]} c="#3f2d20" />
        </group>
      ))}
      {/* 천장 펜던트 조명 3개 */}
      {[-2.0, 0, 2.0].map((x) => (
        <group key={x} position={[x, 2.4, 0.4]}>
          <Cy p={[0, 0.45, 0]} rad={0.012} h={0.9} c="#26262b" />
          <Co p={[0, 0, 0]} rad={0.26} h={0.28} c="#26262b" />
          <Sp p={[0, -0.1, 0]} rad={0.11} c="#fff3c4" e="#ffe9a3" />
        </group>
      ))}
      {/* 벽 선반 + 화분 */}
      <group position={[2.3, 1.9, cz(0) + 0.14]}>
        <B p={[0, 0, 0]} s={[1.4, 0.06, 0.26]} c="#6b4423" />
        {[-0.45, 0, 0.45].map((x, i) => (
          <Cy key={x} p={[x, 0.13, 0]} rad={0.08} h={0.2} c={['#a97142', '#f1f5f9', '#8fbf9f'][i]} />
        ))}
      </group>
      {wide && (
        <group position={[3.8, 0.85, 2.5]}>
          <B p={[0, 0, 0]} s={[3.6, 0.12, 0.7]} c="#6b4423" />
          <B p={[0, -0.42, 0]} s={[0.12, 0.8, 0.12]} c="#6b4423" />
          <B p={[-1.5, -0.42, 0]} s={[0.12, 0.8, 0.12]} c="#6b4423" />
          <Sp p={[-1.05, 0.18, 0]} rad={0.15} c="#fbbf24" e="#fde68a" />
          <Sp p={[0, 0.18, 0]} rad={0.15} c="#f472b6" e="#fbcfe8" />
          <Sp p={[1.05, 0.18, 0]} rad={0.15} c="#60a5fa" e="#bfdbfe" />
        </group>
      )}
    </group>
  );
}

/**
 * 3D 마이룸/정원/교실 씬 — mode: 'room' | 'garden' | 'classroom'
 * roomMap: {"r-c": {id, rot}}, placing: 배치 중인 아이템 id 또는 null
 */
export default function RoomScene({
  avatar, roomMap, wallId, floorId, mode = 'room',
  placing, onPlace, selectedKey, onSelectFurniture,
  companions = [], glRef, height = '58vh',
}) {
  const targetRef = useRef([0.5, 1]);
  const [hover, setHover] = useState(null); // 배치 미리보기 셀

  const wall = (wallId && ITEM_MAP[wallId]?.colors.a) || DEFAULT_WALL;
  const fitem = floorId && ITEM_MAP[floorId];
  const floors = fitem ? [fitem.colors.a, fitem.colors.b || fitem.colors.a] : DEFAULT_FLOOR;

  const placingItem = placing ? ITEM_MAP[placing] : null;

  const clickFloor = (r, c) => (e) => {
    if (e.delta > 4) return; // 드래그(카메라 회전)는 무시
    e.stopPropagation();
    if (placingItem) {
      onPlace?.(`${r}-${c}`);
      setHover(null);
    } else {
      targetRef.current = [e.point.x, e.point.z];
      onSelectFurniture?.(null);
    }
  };

  const wide = isWideSpace(mode);
  const cols = wide ? COLS * 2 : COLS;
  const rows = wide ? ROWS * 2 : ROWS;
  const cx = (c) => c - cols / 2;
  const cz = (r) => r - rows / 2;
  const baseMode = spaceConfig(mode).baseId;
  const garden = baseMode === 'garden';
  const classroom = baseMode === 'classroom';
  const cafe = baseMode === 'cafe';

  // 동반자들이 돌아다닐 수 있는 범위
  const bounds = {
    minX: cx(0) + 0.6, maxX: cx(cols) - 0.6,
    minZ: cz(0) + 0.6, maxZ: cz(rows) - 0.6,
  };

  // 배치된 조명들 (실제로 빛을 냄)
  const lights = Object.entries(roomMap).map(([key, pl]) => {
    const item = ITEM_MAP[pl.id];
    const spec = item && LIGHT_SPEC[item.model];
    if (!spec) return null;
    const [r, c] = key.split('-').map(Number);
    const [w, d] = footprintOf(item, pl.rot || 0);
    return { key, spec, color: item.colors?.a || '#ffffff', x: cx(c) + w / 2, z: cz(r) + d / 2 };
  }).filter(Boolean);

  return (
    <div
      style={{ height }}
      className={`rounded-3xl overflow-hidden border-4 touch-none ${
        garden ? 'border-emerald-200 bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-100'
          : classroom ? 'border-sky-200 bg-gradient-to-b from-sky-100 to-amber-50'
          : cafe ? 'border-amber-700 bg-gradient-to-b from-orange-100 to-amber-50'
          : 'border-amber-200 bg-gradient-to-b from-sky-100 to-amber-50'
      }`}
    >
      <Canvas
        shadows
        camera={{ position: wide ? [12.5, 12.5, 16.5] : [6.5, 6.5, 8.5], fov: wide ? 47 : 42 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => { if (glRef) glRef.current = gl; }}
      >
        {/* 조명을 놓으면 주변이 살짝 어두워져서 불빛이 잘 보여요 */}
        <ambientLight intensity={lights.length ? 0.5 : 0.75} />
        {lights.map((l) => (
          <pointLight
            key={l.key}
            position={[l.x, l.spec.y, l.z]}
            color={l.color}
            intensity={l.spec.i * 2.2}
            distance={l.spec.d}
            decay={2}
          />
        ))}
        <directionalLight
          position={[6, 10, 5]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={wide ? -18 : -8}
          shadow-camera-right={wide ? 18 : 8}
          shadow-camera-top={wide ? 18 : 8}
          shadow-camera-bottom={wide ? -18 : -8}
        />
        {garden ? <GardenShell cols={cols} rows={rows} wide={wide} />
          : classroom ? <ClassShell cols={cols} rows={rows} wide={wide} />
          : cafe ? <CafeShell cols={cols} rows={rows} wide={wide} />
          : <Shell wall={wall} floors={floors} cols={cols} rows={rows} wide={wide} />}

        {/* 바닥 클릭/호버 레이어 */}
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          return (
            <mesh
              key={`h${i}`}
              rotation-x={-Math.PI / 2}
              position={[cx(c) + 0.5, 0.01, cz(r) + 0.5]}
              onClick={clickFloor(r, c)}
              onPointerMove={placingItem ? (e) => { e.stopPropagation(); setHover(`${r}-${c}`); } : undefined}
              onPointerOut={placingItem ? () => setHover((h) => (h === `${r}-${c}` ? null : h)) : undefined}
            >
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          );
        })}

        {/* 배치 미리보기 */}
        {placingItem && hover && (() => {
          const [r, c] = hover.split('-').map(Number);
          const [w, d] = footprintOf(placingItem, 0);
          const prevKey = Object.keys(roomMap).find((k) => roomMap[k].id === placing) || null;
          const ok = canPlaceAt(roomMap, hover, placingItem, 0, prevKey, cols, rows);
          return (
            <mesh rotation-x={-Math.PI / 2} position={[cx(c) + w / 2, 0.02, cz(r) + d / 2]}>
              <planeGeometry args={[w, d]} />
              <meshBasicMaterial color={ok ? '#4ade80' : '#ef4444'} transparent opacity={0.45} />
            </mesh>
          );
        })()}

        {/* 배치된 가구 */}
        {Object.entries(roomMap).map(([key, pl]) => {
          const item = ITEM_MAP[pl.id];
          if (!item) return null;
          const rot = pl.rot || 0;
          const [w, d] = footprintOf(item, rot);
          const [r, c] = key.split('-').map(Number);
          return (
            <group
              key={key}
              position={[cx(c) + w / 2, 0, cz(r) + d / 2]}
              onClick={(e) => {
                if (e.delta > 4) return;
                e.stopPropagation();
                if (!placingItem) onSelectFurniture?.(key);
              }}
            >
              <group rotation-y={-rot * (Math.PI / 2)}>
                <FurnitureModel model={item.model} colors={item.colors} />
              </group>
              {selectedKey === key && (
                <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}>
                  <ringGeometry args={[Math.max(w, d) / 2 - 0.05, Math.max(w, d) / 2 + 0.08, 32]} />
                  <meshBasicMaterial color="#a855f7" transparent opacity={0.8} />
                </mesh>
              )}
            </group>
          );
        })}

        {/* 내 캐릭터 */}
        <Walker avatar={avatar} targetRef={targetRef} />

        {/* 👫🐾 내가 산 친구들과 애완동물 — 스스로 돌아다녀요 */}
        {companions.map((c, i) => {
          if (c.slot === 'friend') {
            return (
              <Wanderer key={c.id} bounds={bounds} seed={i} speed={0.9} scale={0.85}>
                <Character avatar={{ base: c.base }} />
              </Wanderer>
            );
          }
          const P = PET_MODELS[c.model];
          if (!P) return null;
          const fly = FLYING_PETS.includes(c.model);
          return (
            <Wanderer key={c.id} bounds={bounds} seed={i} speed={fly ? 1.5 : 1.2} fly={fly} scale={1}>
              <P {...c.colors} />
            </Wanderer>
          );
        })}

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={wide ? 32 : 17}
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={0.35}
          target={[0.5, 0.6, 0.5]}
        />
      </Canvas>
    </div>
  );
}
