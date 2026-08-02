import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { B, Cy, Sp, Co } from './prims.jsx';
import { HAT_MODELS, FACE_MODELS, HAND_MODELS } from './models.jsx';
import { speciesOf, ITEM_MAP } from '../lib/items';

/** 두 색을 섞어 밝기/그림자 색을 만들어요 (#rrggbb) */
function mix(a, b, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const h = (v) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r1 + (r2 - r1) * t)}${h(g1 + (g2 - g1) * t)}${h(b1 + (b2 - b1) * t)}`;
}

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
  if (ear === 'small') {
    return (
      <group>
        {[-0.16, 0.16].map((x) => (
          <group key={x}>
            <Sp p={[x, 1.14, 0]} rad={0.07} sc={[1, 1, 0.6]} c={body} />
            <Sp p={[x, 1.14, 0.04]} rad={0.04} sc={[1, 1, 0.4]} c={earIn} />
          </group>
        ))}
      </group>
    );
  }
  if (ear === 'fin') { // 돌고래·상어·고래 — 등지느러미 + 옆지느러미
    return (
      <group>
        <Co p={[0, 1.2, -0.12]} rad={0.11} h={0.3} c={body} r={[-0.35, 0, 0]} />
        {[-0.3, 0.3].map((x, i) => (
          <Sp key={x} p={[x, 0.42, -0.05]} rad={0.12} sc={[0.8, 0.3, 1.1]} c={body} r={[0, 0, i ? -0.5 : 0.5]} />
        ))}
      </group>
    );
  }
  if (ear === 'beak') { // 펭귄 — 귀 없이 부리
    return (
      <group>
        <Co p={[0, 0.95, 0.3]} rad={0.07} h={0.16} c={earIn} r={[Math.PI / 2, 0, 0]} />
        <Sp p={[0, 1.12, -0.06]} rad={0.06} sc={[0.7, 1.1, 0.7]} c={body} />
      </group>
    );
  }
  if (ear === 'none') return null;
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

/* 종족별 특징 — 갈기·뿔·등껍질·촉수 등 */
function Extras({ sp }) {
  const e = sp.extra;
  return (
    <group>
      {/* 호랑이·얼룩말 줄무늬 */}
      {sp.stripes && [0.55, 0.42, 0.3].map((y, i) => (
        <Sp key={i} p={[0, y, -0.22]} rad={0.07} sc={[2.2, 0.28, 0.5]} c="#26262b" />
      ))}
      {/* 너구리 눈가 무늬 */}
      {sp.mask && [-0.1, 0.1].map((x) => (
        <Sp key={x} p={[x, 1.04, 0.2]} rad={0.075} sc={[1, 0.9, 0.35]} c="#3f4655" />
      ))}
      {e === 'mane' && [...Array(10)].map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <Sp key={i} p={[Math.cos(a) * 0.3, 0.97 + Math.sin(a) * 0.3, -0.04]} rad={0.12} sc={[1, 1, 0.7]} c="#b45309" />;
      })}
      {e === 'horn' && (
        <group>
          <Co p={[0, 1.36, 0.1]} rad={0.055} h={0.34} c="#fde047" r={[-0.25, 0, 0]} />
          <Sp p={[0, 1.5, 0.06]} rad={0.03} c="#fef9c3" e="#fde047" />
        </group>
      )}
      {e === 'antler' && [-0.13, 0.13].map((x, i) => (
        <group key={x}>
          <Cy p={[x, 1.3, 0]} rad={0.022} h={0.3} c="#8a5f36" r={[0, 0, i ? -0.3 : 0.3]} />
          <Cy p={[x + (i ? 0.1 : -0.1), 1.45, 0]} rad={0.016} h={0.16} c="#8a5f36" r={[0, 0, i ? -0.9 : 0.9]} />
          <Cy p={[x + (i ? 0.05 : -0.05), 1.5, 0.02]} rad={0.016} h={0.14} c="#8a5f36" r={[0.3, 0, i ? -0.3 : 0.3]} />
        </group>
      ))}
      {e === 'wing' && [-1, 1].map((s) => (
        <group key={s}>
          <Sp p={[s * 0.42, 0.62, -0.2]} rad={0.22} sc={[0.5, 1.3, 0.15]} c="#a7f3d0" r={[0, 0, s * 0.4]} />
        </group>
      ))}
      {e === 'shell' && (
        <group>
          <Sp p={[0, 0.5, -0.14]} rad={0.33} sc={[1, 0.95, 0.75]} c="#8a5f36" />
          {[[0, 0.62], [-0.16, 0.48], [0.16, 0.48], [0, 0.36]].map(([x, y], i) => (
            <Sp key={i} p={[x, y, 0.04]} rad={0.08} sc={[1, 1, 0.35]} c="#a97142" />
          ))}
        </group>
      )}
      {e === 'tentacle' && [...Array(6)].map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <group key={i}>
            <Sp p={[Math.cos(a) * 0.26, 0.12, Math.sin(a) * 0.26]} rad={0.07} sc={[1, 0.8, 2.0]} c={sp.body} r={[0, -a, 0]} />
            <Sp p={[Math.cos(a) * 0.4, 0.07, Math.sin(a) * 0.4]} rad={0.05} c={sp.belly} />
          </group>
        );
      })}
      {e === 'ringtail' && [...Array(7)].map((_, i) => (
        <Sp key={i} p={[0.05, 0.42 + i * 0.11, -0.34 - i * 0.02]} rad={0.075} c={i % 2 ? '#f8fafc' : '#26262b'} />
      ))}
      {e === 'spike' && [0, 1, 2, 3].map((i) => (
        <Co key={i} p={[0, 0.72 - i * 0.13, -0.24]} rad={0.045} h={0.12} c="#4d7c0f" r={[-0.5, 0, 0]} />
      ))}
      {e === 'whisker' && [-1, 1].map((s) => (
        <group key={s}>
          {[0, 1].map((j) => (
            <Cy key={j} p={[s * 0.2, 0.9 - j * 0.03, 0.24]} rad={0.006} h={0.2} c="#f8fafc" r={[0, 0, s * (1.3 + j * 0.2)]} />
          ))}
        </group>
      ))}
      {e === 'teeth' && [-0.06, 0.06].map((x) => (
        <Co key={x} p={[x, 0.86, 0.26]} rad={0.025} h={0.07} c="#ffffff" r={[Math.PI, 0, 0]} />
      ))}
      {e === 'spout' && (
        <group>
          <Sp p={[0, 1.32, 0]} rad={0.05} c="#dbeafe" o={0.8} />
          <Sp p={[-0.07, 1.44, 0.03]} rad={0.045} c="#dbeafe" o={0.6} />
          <Sp p={[0.08, 1.5, -0.02]} rad={0.04} c="#dbeafe" o={0.5} />
        </group>
      )}
    </group>
  );
}

/* 아바타 본체 — 정면 = +z */
export function Character({ avatar = {} }) {
  const sp = speciesOf(avatar.base);
  const frog = sp.ear === 'top';
  const noSnout = sp.ear === 'beak' || sp.extra === 'tentacle';

  const hatItem = avatar.hat ? ITEM_MAP[avatar.hat] : null;
  const faceItem = avatar.face ? ITEM_MAP[avatar.face] : null;
  const accItem = avatar.acc ? ITEM_MAP[avatar.acc] : null;
  const Hat = hatItem && HAT_MODELS[hatItem.model];
  const Face = faceItem && FACE_MODELS[faceItem.model];
  const Hand = accItem && HAND_MODELS[accItem.model];

  // 몸통보다 살짝 어두운 그림자색 (입체감을 주는 용도)
  const shade = sp.shade || mix(sp.body, '#000000', 0.12);

  return (
    <group>
      {/* ── 다리 + 발바닥 ── */}
      {[-0.14, 0.14].map((x) => (
        <group key={x}>
          <Sp p={[x, 0.11, -0.01]} rad={0.125} sc={[1, 0.95, 1.15]} c={sp.body} />
          <Sp p={[x, 0.07, 0.08]} rad={0.07} sc={[1, 0.55, 0.8]} c={sp.belly} />
        </group>
      ))}

      {/* ── 몸통: 아래가 넓은 물방울 모양 + 가슴털 ── */}
      <Sp p={[0, 0.42, 0]} rad={0.32} sc={[1, 1.02, 0.9]} c={sp.body} />
      <Sp p={[0, 0.3, 0]} rad={0.3} sc={[1.02, 0.8, 0.92]} c={sp.body} />
      <Sp p={[0, 0.4, 0.15]} rad={0.23} sc={[0.88, 0.95, 0.55]} c={sp.belly} />
      <Sp p={[0, 0.6, 0.14]} rad={0.1} sc={[1.5, 0.7, 0.5]} c={sp.belly} />
      {/* 등 그림자 */}
      <Sp p={[0, 0.44, -0.14]} rad={0.26} sc={[0.95, 0.95, 0.5]} c={shade} />

      {/* ── 팔 (어깨 → 손) ── */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Sp p={[s * 0.3, 0.52, 0.02]} rad={0.115} sc={[0.9, 1.15, 0.9]} c={sp.body} r={[0, 0, s * 0.25]} />
          <Sp p={[s * 0.34, 0.38, 0.06]} rad={0.085} c={sp.belly} />
        </group>
      ))}

      {/* ── 꼬리 ── */}
      <Sp p={[0, 0.34, -0.3]} rad={0.1} sc={[1, 1, 0.9]} c={sp.belly} />

      {/* ── 머리 (살짝 아래가 넓은 계란형) ── */}
      <Sp p={[0, 0.98, 0]} rad={0.29} sc={[1, 0.98, 0.96]} c={sp.body} />
      <Sp p={[0, 0.91, 0.02]} rad={0.27} sc={[1.02, 0.85, 0.98]} c={sp.body} />
      {/* 이마 하이라이트 */}
      <Sp p={[-0.09, 1.14, 0.12]} rad={0.07} sc={[1.4, 0.5, 0.4]} c={mix(sp.body, '#ffffff', 0.35)} />

      {/* 판다 눈두덩 */}
      {sp.panda && [-0.11, 0.11].map((x) => (
        <Sp key={x} p={[x, 1.03, 0.19]} rad={0.085} sc={[1, 1.25, 0.55]} c="#26262b" r={[0, 0, x < 0 ? 0.3 : -0.3]} />
      ))}

      {/* ── 주둥이 / 코 ── */}
      {sp.pig ? (
        <group>
          <Cy p={[0, 0.93, 0.27]} rad={0.085} h={0.07} c={sp.earIn} r={[Math.PI / 2, 0, 0]} />
          <Sp p={[-0.03, 0.93, 0.305]} rad={0.016} c="#9d3b63" />
          <Sp p={[0.03, 0.93, 0.305]} rad={0.016} c="#9d3b63" />
        </group>
      ) : noSnout ? null : (
        <group>
          {!frog && (
            <Sp
              p={[0, 0.9, 0.21]} rad={0.12} sc={[1.05, 0.7, 0.62]}
              c={sp.belly === sp.body ? mix(sp.body, '#ffffff', 0.25) : sp.belly}
            />
          )}
          {/* 코 — 둥근 삼각형 느낌 */}
          <Sp p={[0, 0.95, frog ? 0.26 : 0.29]} rad={0.034} sc={[1.25, 0.85, 0.9]} c="#3f2d20" />
          <Sp p={[-0.012, 0.962, frog ? 0.285 : 0.315]} rad={0.011} c={mix('#3f2d20', '#ffffff', 0.45)} />
          {/* 입 — 살짝 웃는 선 */}
          <Sp p={[-0.035, 0.884, 0.28]} rad={0.016} sc={[1.6, 0.35, 0.5]} c="#7a4a3a" r={[0, 0, 0.4]} />
          <Sp p={[0.035, 0.884, 0.28]} rad={0.016} sc={[1.6, 0.35, 0.5]} c="#7a4a3a" r={[0, 0, -0.4]} />
        </group>
      )}

      {/* ── 눈 (흰자 + 눈동자 + 하이라이트 + 눈썹선) ── */}
      {!frog && (
        <group>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Sp p={[s * 0.105, 1.04, 0.215]} rad={0.056} sc={[1, 1.1, 0.7]} c="#ffffff" />
              <Sp p={[s * 0.108, 1.035, 0.245]} rad={0.039} sc={[1, 1.05, 0.7]} c="#26262b" />
              <Sp p={[s * 0.108 + 0.016, 1.055, 0.268]} rad={0.015} c="#ffffff" />
              <Sp p={[s * 0.108 - 0.014, 1.017, 0.266]} rad={0.007} c="#ffffff" />
              {/* 위 눈꺼풀 라인 */}
              <Sp p={[s * 0.105, 1.078, 0.235]} rad={0.05} sc={[1.05, 0.28, 0.55]} c={shade} />
            </group>
          ))}
          {/* 볼터치 */}
          <Sp p={[-0.185, 0.945, 0.175]} rad={0.048} sc={[1.1, 0.65, 0.35]} c="#ffb3c1" />
          <Sp p={[0.185, 0.945, 0.175]} rad={0.048} sc={[1.1, 0.65, 0.35]} c="#ffb3c1" />
        </group>
      )}

      <Ears sp={sp} />
      <Extras sp={sp} />

      {/* 착용 아이템 */}
      {Hat && <group position={[0, 1.22, 0]}><Hat {...hatItem.colors} /></group>}
      {Face && <group position={[0, 1.04, 0.28]}><Face {...faceItem.colors} /></group>}
      {Hand && <group position={[0.4, 0.4, 0.12]}><Hand {...accItem.colors} /></group>}
    </group>
  );
}

/* =====================================================================
   🚶 스스로 돌아다니는 동반자 (친구·애완동물)
   무작위 목적지를 정해 걸어가고, 도착하면 잠시 쉬었다가 다시 출발해요.
   ===================================================================== */
export function Wanderer({ bounds, speed = 1.1, fly = false, scale = 1, seed = 0, children }) {
  const g = useRef();
  const st = useRef({ init: false, tx: 0, tz: 0, wait: 0 });
  const pick = (lo, hi) => lo + Math.random() * (hi - lo);

  useFrame((state, dt) => {
    const gp = g.current;
    if (!gp) return;
    const s = st.current;
    const t = state.clock.elapsedTime;

    if (!s.init) {
      s.init = true;
      gp.position.set(pick(bounds.minX, bounds.maxX), 0, pick(bounds.minZ, bounds.maxZ));
      s.tx = gp.position.x;
      s.tz = gp.position.z;
      s.wait = (seed % 5) * 0.4; // 같은 순간에 우르르 움직이지 않도록 시차를 둬요
    }

    const bob = fly
      ? 0.15 + Math.sin(t * 2.4 + seed) * 0.09
      : Math.abs(Math.sin(t * 12 + seed)) * 0.045;

    if (s.wait > 0) {
      s.wait -= dt;
      gp.position.y += ((fly ? 0.15 + Math.sin(t * 2 + seed) * 0.07 : 0) - gp.position.y) * 0.08;
      return;
    }

    const dx = s.tx - gp.position.x;
    const dz = s.tz - gp.position.z;
    const d = Math.hypot(dx, dz);

    if (d < 0.1) { // 도착 — 쉬었다가 새 목적지
      s.wait = 1 + Math.random() * 3.5;
      s.tx = pick(bounds.minX, bounds.maxX);
      s.tz = pick(bounds.minZ, bounds.maxZ);
      return;
    }

    const step = Math.min(d, speed * dt);
    gp.position.x += (dx / d) * step;
    gp.position.z += (dz / d) * step;
    gp.position.y = bob;

    const targetRot = Math.atan2(dx, dz);
    let diff = targetRot - gp.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    gp.rotation.y += diff * Math.min(1, dt * 8);
  });

  return <group ref={g} scale={scale}>{children}</group>;
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
