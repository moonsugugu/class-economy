import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { B, Sp } from './prims.jsx';
import { FurnitureModel } from './models.jsx';
import { Walker } from './Character3D.jsx';
import {
  ITEM_MAP, ROOM_COLS as COLS, ROOM_ROWS as ROWS,
  footprintOf, canPlaceAt, DEFAULT_WALL, DEFAULT_FLOOR, GARDEN_FLOOR,
  CLASS_FLOOR, LIGHT_SPEC,
} from '../lib/items';

const cx = (c) => c - COLS / 2;
const cz = (r) => r - ROWS / 2;

function Shell({ wall, floors }) {
  const [fa, fb] = floors;
  return (
    <group>
      {/* 바닥 타일 */}
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const r = Math.floor(i / COLS), c = i % COLS;
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[cx(c) + 0.5, 0, cz(r) + 0.5]} receiveShadow>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={(r + c) % 2 ? fa : fb} roughness={0.85} />
          </mesh>
        );
      })}
      {/* 뒷벽 + 왼벽 */}
      <B p={[0, 1.5, cz(0) - 0.1]} s={[COLS + 0.4, 3, 0.2]} c={wall} />
      <B p={[cx(0) - 0.1, 1.5, 0]} s={[0.2, 3, ROWS + 0.4]} c={wall} />
      {/* 걸레받이 */}
      <B p={[0, 0.09, cz(0) + 0.015]} s={[COLS, 0.18, 0.05]} c="#ffffff" />
      <B p={[cx(0) + 0.015, 0.09, 0]} s={[0.05, 0.18, ROWS]} c="#ffffff" />
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
    </group>
  );
}

function GardenShell() {
  const [fa, fb] = GARDEN_FLOOR;
  const posts = [];
  for (let c = 0; c <= COLS; c++) {
    posts.push([cx(c), cz(0)], [cx(c), cz(ROWS)]);
  }
  for (let r = 1; r < ROWS; r++) {
    posts.push([cx(0), cz(r)], [cx(COLS), cz(r)]);
  }
  return (
    <group>
      {/* 잔디 타일 */}
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const r = Math.floor(i / COLS), c = i % COLS;
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[cx(c) + 0.5, 0, cz(r) + 0.5]} receiveShadow>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={(r + c) % 2 ? fa : fb} roughness={0.95} />
          </mesh>
        );
      })}
      {/* 흙 테두리 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[COLS + 1.6, ROWS + 1.6]} />
        <meshStandardMaterial color="#c9a468" roughness={1} />
      </mesh>
      {/* 하얀 울타리 */}
      {posts.map(([x, z], i) => (
        <B key={i} p={[x, 0.3, z]} s={[0.09, 0.6, 0.09]} c="#ffffff" />
      ))}
      <B p={[0, 0.42, cz(0)]} s={[COLS, 0.07, 0.05]} c="#ffffff" />
      <B p={[0, 0.42, cz(ROWS)]} s={[COLS, 0.07, 0.05]} c="#ffffff" />
      <B p={[cx(0), 0.42, 0]} s={[0.05, 0.07, ROWS]} c="#ffffff" />
      <B p={[cx(COLS), 0.42, 0]} s={[0.05, 0.07, ROWS]} c="#ffffff" />
      {/* 해 + 구름 */}
      <Sp p={[-4, 5.2, -4]} rad={0.55} c="#fde047" e="#fde047" />
      <group position={[2.5, 4.6, -3.5]}>
        <Sp p={[0, 0, 0]} rad={0.4} sc={[1.6, 0.8, 0.9]} c="#ffffff" />
        <Sp p={[0.5, 0.1, 0]} rad={0.3} c="#ffffff" />
      </group>
      <group position={[-2.8, 4.1, 2]}>
        <Sp p={[0, 0, 0]} rad={0.3} sc={[1.7, 0.7, 0.9]} c="#ffffff" />
      </group>
    </group>
  );
}

/* 🏫 교실 — 큰 창문과 나무 마루가 있는 교실 */
function ClassShell() {
  const [fa, fb] = CLASS_FLOOR;
  return (
    <group>
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const r = Math.floor(i / COLS), c = i % COLS;
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[cx(c) + 0.5, 0, cz(r) + 0.5]} receiveShadow>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={(r + c) % 2 ? fa : fb} roughness={0.8} />
          </mesh>
        );
      })}
      {/* 벽 */}
      <B p={[0, 1.6, cz(0) - 0.1]} s={[COLS + 0.4, 3.2, 0.2]} c="#eef2f7" />
      <B p={[cx(0) - 0.1, 1.6, 0]} s={[0.2, 3.2, ROWS + 0.4]} c="#eef2f7" />
      {/* 아래쪽 나무 굽도리 */}
      <B p={[0, 0.16, cz(0) + 0.02]} s={[COLS, 0.32, 0.06]} c="#d6bd97" />
      <B p={[cx(0) + 0.02, 0.16, 0]} s={[0.06, 0.32, ROWS]} c="#d6bd97" />
      {/* 왼쪽 벽 큰 창문 3개 */}
      {[-1.6, 0.2, 2.0].map((z) => (
        <group key={z} position={[cx(0) + 0.03, 1.9, z]}>
          <B p={[0, 0, 0]} s={[0.06, 1.5, 1.3]} c="#ffffff" />
          <B p={[0.02, 0, 0]} s={[0.04, 1.3, 1.1]} c="#bfe4f8" e="#a8d8ef" />
          <B p={[0.05, 0, 0]} s={[0.02, 1.3, 0.05]} c="#ffffff" />
          <B p={[0.05, 0, 0]} s={[0.02, 0.05, 1.1]} c="#ffffff" />
        </group>
      ))}
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
  glRef, height = '58vh',
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

  const garden = mode === 'garden';
  const classroom = mode === 'classroom';

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
          : classroom ? 'border-sky-200 bg-gradient-to-b from-sky-100 to-slate-100'
          : 'border-amber-200 bg-gradient-to-b from-sky-100 to-amber-50'
      }`}
    >
      <Canvas
        shadows
        camera={{ position: [6.5, 6.5, 8.5], fov: 42 }}
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
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        {garden ? <GardenShell /> : classroom ? <ClassShell /> : <Shell wall={wall} floors={floors} />}

        {/* 바닥 클릭/호버 레이어 */}
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = Math.floor(i / COLS), c = i % COLS;
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
          const ok = canPlaceAt(roomMap, hover, placingItem, 0, prevKey);
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

        {/* 캐릭터 */}
        <Walker avatar={avatar} targetRef={targetRef} />

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={17}
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={0.35}
          target={[0.5, 0.6, 0.5]}
        />
      </Canvas>
    </div>
  );
}
