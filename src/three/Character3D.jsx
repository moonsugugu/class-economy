import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { B, Cy, Sp, Co } from './prims.jsx';
import { HAT_MODELS, FACE_MODELS, HAND_MODELS } from './models.jsx';
import { SPECIES, ITEM_MAP } from '../lib/items';

/* 귀 모양 */
function Ears({ sp }) {
  const { ear, body, earIn } = sp;
  if (ear === 'long') {
    return (
      <group>
        {[-0.11, 0.11].map((x) => (
          <group key={x}>
            <Sp p={[x, 1.36, 0]} rad={0.085} sc={[1, 2.4, 0.6]} c={body} />
            <Sp p={[x, 1.36, 0.035]} rad={0.05} sc={[1, 2.1, 0.4]} c={earIn} />
          </group>
        ))}
      </group>
    );
  }
  if (ear === 'round') {
    return (
      <group>
        {[-0.17, 0.17].map((x) => (
          <group key={x}>
            <Sp p={[x, 1.16, 0]} rad={0.1} c={body} />
            <Sp p={[x, 1.16, 0.045]} rad={0.06} sc={[1, 1, 0.5]} c={earIn} />
          </group>
        ))}
      </group>
    );
  }
  if (ear === 'biground') {
    return (
      <group>
        {[-0.22, 0.22].map((x) => (
          <group key={x}>
            <Sp p={[x, 1.12, 0]} rad={0.14} sc={[1, 1, 0.55]} c={sp.body} />
            <Sp p={[x, 1.12, 0.05]} rad={0.09} sc={[1, 1, 0.4]} c={earIn} />
          </group>
        ))}
      </group>
    );
  }
  if (ear === 'pointy') {
    return (
      <group>
        {[-0.14, 0.14].map((x, i) => (
          <group key={x}>
            <Co p={[x, 1.24, 0]} rad={0.09} h={0.22} c={body} r={[0, 0, i === 0 ? 0.25 : -0.25]} />
            <Co p={[x, 1.23, 0.03]} rad={0.05} h={0.15} c={earIn} r={[0, 0, i === 0 ? 0.25 : -0.25]} />
          </group>
        ))}
      </group>
    );
  }
  if (ear === 'floppy') {
    return (
      <group>
        {[-0.24, 0.24].map((x) => (
          <Sp key={x} p={[x, 1.0, 0]} rad={0.09} sc={[0.9, 1.9, 0.5]} c={earIn} />
        ))}
      </group>
    );
  }
  // top (개구리 눈)
  return (
    <group>
      {[-0.12, 0.12].map((x) => (
        <group key={x}>
          <Sp p={[x, 1.22, 0.02]} rad={0.09} c={sp.body} />
          <Sp p={[x, 1.24, 0.08]} rad={0.04} c="#26262b" />
        </group>
      ))}
    </group>
  );
}

/* 아바타 본체 — 정면 = +z */
export function Character({ avatar = {} }) {
  const sp = SPECIES[avatar.base] || SPECIES['🐰'];
  const frog = sp.ear === 'top';

  const hatItem = avatar.hat ? ITEM_MAP[avatar.hat] : null;
  const faceItem = avatar.face ? ITEM_MAP[avatar.face] : null;
  const accItem = avatar.acc ? ITEM_MAP[avatar.acc] : null;
  const Hat = hatItem && HAT_MODELS[hatItem.model];
  const Face = faceItem && FACE_MODELS[faceItem.model];
  const Hand = accItem && HAND_MODELS[accItem.model];

  return (
    <group>
      {/* 다리 */}
      <Sp p={[-0.14, 0.1, 0]} rad={0.12} c={sp.body} />
      <Sp p={[0.14, 0.1, 0]} rad={0.12} c={sp.body} />
      {/* 몸통 + 배 */}
      <Sp p={[0, 0.44, 0]} rad={0.31} sc={[1, 1.05, 0.88]} c={sp.body} />
      <Sp p={[0, 0.42, 0.14]} rad={0.22} sc={[0.9, 0.95, 0.55]} c={sp.belly} />
      {/* 팔 */}
      <Sp p={[-0.31, 0.5, 0.05]} rad={0.11} c={sp.body} />
      <Sp p={[0.31, 0.5, 0.05]} rad={0.11} c={sp.body} />
      {/* 꼬리 */}
      <Sp p={[0, 0.35, -0.28]} rad={0.09} c={sp.belly} />
      {/* 머리 */}
      <Sp p={[0, 0.97, 0]} rad={0.28} c={sp.body} />
      {/* 판다 무늬 */}
      {sp.panda && (
        <group>
          <Sp p={[-0.1, 1.03, 0.2]} rad={0.07} sc={[1, 1.3, 0.5]} c="#26262b" />
          <Sp p={[0.1, 1.03, 0.2]} rad={0.07} sc={[1, 1.3, 0.5]} c="#26262b" />
        </group>
      )}
      {/* 주둥이/코 */}
      {sp.pig ? (
        <group>
          <Cy p={[0, 0.94, 0.27]} rad={0.08} h={0.06} c={sp.earIn} r={[Math.PI / 2, 0, 0]} />
          <Sp p={[-0.03, 0.94, 0.3]} rad={0.015} c="#9d3b63" />
          <Sp p={[0.03, 0.94, 0.3]} rad={0.015} c="#9d3b63" />
        </group>
      ) : (
        <group>
          {!frog && <Sp p={[0, 0.91, 0.22]} rad={0.11} sc={[1, 0.72, 0.6]} c={sp.belly === sp.body ? '#f3f3f3' : sp.belly} />}
          <Sp p={[0, 0.955, frog ? 0.27 : 0.3]} rad={0.032} c="#3f2d20" />
        </group>
      )}
      {/* 눈 */}
      <group>
        <Sp p={[-0.1, 1.04, 0.235]} rad={0.042} c="#26262b" />
        <Sp p={[0.1, 1.04, 0.235]} rad={0.042} c="#26262b" />
        <Sp p={[-0.085, 1.055, 0.265]} rad={0.014} c="#ffffff" />
        <Sp p={[0.115, 1.055, 0.265]} rad={0.014} c="#ffffff" />
        {/* 볼터치 */}
        <Sp p={[-0.17, 0.94, 0.2]} rad={0.04} sc={[1, 0.6, 0.4]} c="#ffb3c1" />
        <Sp p={[0.17, 0.94, 0.2]} rad={0.04} sc={[1, 0.6, 0.4]} c="#ffb3c1" />
      </group>
      <Ears sp={sp} />
      {/* 착용 아이템 */}
      {Hat && <group position={[0, sp.ear === 'long' ? 1.2 : 1.2, 0]}><Hat {...hatItem.colors} /></group>}
      {Face && <group position={[0, 1.04, 0.27]}><Face {...faceItem.colors} /></group>}
      {Hand && <group position={[0.4, 0.44, 0.12]}><Hand {...accItem.colors} /></group>}
    </group>
  );
}

/* 방 안을 걸어다니는 캐릭터 — targetRef.current = [x, z] */
export function Walker({ avatar, targetRef, start = [0.5, 0, 1] }) {
  const g = useRef();
  useFrame((state, dt) => {
    const gp = g.current;
    if (!gp) return;
    const [tx, tz] = targetRef.current;
    const dx = tx - gp.position.x;
    const dz = tz - gp.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.06) {
      const step = Math.min(dist, 2.6 * dt);
      gp.position.x += (dx / dist) * step;
      gp.position.z += (dz / dist) * step;
      const targetRot = Math.atan2(dx, dz);
      let diff = targetRot - gp.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      gp.rotation.y += diff * Math.min(1, dt * 12);
      gp.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 11)) * 0.07;
      gp.rotation.z = Math.sin(state.clock.elapsedTime * 11) * 0.05;
    } else {
      gp.position.y += (Math.sin(state.clock.elapsedTime * 2.2) * 0.02 - gp.position.y) * 0.1;
      gp.rotation.z *= 0.85;
    }
  });
  return (
    <group ref={g} position={start}>
      <Character avatar={avatar} />
    </group>
  );
}
