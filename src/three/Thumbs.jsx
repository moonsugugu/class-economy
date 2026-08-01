/* =====================================================================
   아이템 3D 썸네일 공장
   상점·인벤토리에서 이모지 대신 "진짜 3D 모습"을 보여주기 위해,
   숨겨진 캔버스 1개에서 아이템을 하나씩 그려 이미지로 저장(캐시)해요.
   (WebGL 컨텍스트를 1개만 쓰기 때문에 아이템이 많아도 무겁지 않아요)
   ===================================================================== */
import { createContext, useContext, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { FurnitureModel, HAT_MODELS, FACE_MODELS, HAND_MODELS, PET_MODELS } from './models.jsx';
import { Character } from './Character3D.jsx';
import { ITEM_MAP } from '../lib/items';

const cache = new Map(); // itemId → dataURL
const ThumbCtx = createContext(null);

/** 슬롯별로 카메라에 예쁘게 담기도록 위치·크기를 맞춰요 */
function ItemNode({ item }) {
  if (item.slot === 'char' || item.slot === 'friend') {
    return (
      <group position={[0, -0.75, 0]} scale={1.15}>
        <Character avatar={{ base: item.base }} />
      </group>
    );
  }
  if (item.slot === 'pet') {
    const P = PET_MODELS[item.model];
    return P ? <group position={[0, -0.3, 0]} scale={2.1}><P {...item.colors} /></group> : null;
  }
  if (item.slot === 'hat') {
    const M = HAT_MODELS[item.model];
    return M ? <group position={[0, -0.15, 0]} scale={2.4}><M {...item.colors} /></group> : null;
  }
  if (item.slot === 'face') {
    const M = FACE_MODELS[item.model];
    return M ? <group scale={4.2}><M {...item.colors} /></group> : null;
  }
  if (item.slot === 'acc') {
    const M = HAND_MODELS[item.model];
    return M ? <group position={[0, -0.5, 0]} scale={1.9}><M {...item.colors} /></group> : null;
  }
  // 가구·정원·교실·조명
  return (
    <group position={[0, -0.6, 0]} scale={0.95}>
      <FurnitureModel model={item.model} colors={item.colors} />
    </group>
  );
}

function Capture({ id, onDone }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!id) return;
    let raf2;
    // 모델이 씬에 올라온 뒤(두 프레임 후) 캡처해요
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try {
          gl.render(scene, camera);
          onDone(id, gl.domElement.toDataURL('image/png'));
        } catch {
          onDone(id, null);
        }
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [id]);

  if (!id) return null;
  const item = ITEM_MAP[id];
  if (!item) return null;
  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} />
      <ItemNode item={item} />
    </>
  );
}

export function ThumbProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [tick, setTick] = useState(0);

  const request = (id) => {
    if (!id || cache.has(id)) return;
    setQueue((q) => (q.includes(id) ? q : [...q, id]));
  };
  const onDone = (id, url) => {
    cache.set(id, url);
    setQueue((q) => q.filter((x) => x !== id));
    setTick((n) => n + 1);
  };

  return (
    <ThumbCtx.Provider value={{ request, get: (id) => cache.get(id), tick }}>
      {children}
      {/* 화면 밖 숨겨진 썸네일 렌더러 */}
      <div style={{ position: 'fixed', left: -9999, top: 0, width: 132, height: 132, pointerEvents: 'none' }}>
        <Canvas
          gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
          frameloop="demand"
          camera={{ position: [1.9, 1.5, 2.2], fov: 38 }}
        >
          <Capture id={queue[0]} onDone={onDone} />
        </Canvas>
      </div>
    </ThumbCtx.Provider>
  );
}

/** 아이템 3D 썸네일 <img> — 준비 전에는 은은한 로딩 박스가 보여요 */
export function ItemThumb({ id, size = 56 }) {
  const ctx = useContext(ThumbCtx);
  const item = ITEM_MAP[id];
  useEffect(() => { ctx?.request(id); }, [id, ctx]);

  // 벽지·바닥은 색 자체가 아이템이라 색상 칩으로 보여줘요
  if (item && (item.slot === 'wall' || item.slot === 'floor')) {
    return (
      <div
        style={{ width: size, height: size, background: item.colors.a }}
        className="rounded-xl border border-gray-200 mx-auto"
      />
    );
  }

  const url = ctx?.get(id);
  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gray-100 animate-pulse mx-auto"
      />
    );
  }
  return <img src={url} alt="" width={size} height={size} className="mx-auto object-contain" />;
}
