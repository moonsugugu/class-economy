// 3D 기본 도형 헬퍼 — 모든 가구/아이템은 이 도형들의 조합으로 만든다
const Mat = ({ c = '#ccc', e, o, m = 0.05, rough = 0.6 }) => (
  <meshStandardMaterial
    color={c}
    emissive={e || '#000000'}
    emissiveIntensity={e ? 0.7 : 0}
    transparent={o !== undefined}
    opacity={o ?? 1}
    roughness={rough}
    metalness={m}
  />
);

export const B = ({ p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], c, e, o, m }) => (
  <mesh position={p} rotation={r} castShadow receiveShadow>
    <boxGeometry args={s} />
    <Mat c={c} e={e} o={o} m={m} />
  </mesh>
);

export const Cy = ({ p = [0, 0, 0], rad = 0.5, rTop, rBot, h = 1, c, r = [0, 0, 0], seg = 24, e, o, m }) => (
  <mesh position={p} rotation={r} castShadow receiveShadow>
    <cylinderGeometry args={[rTop ?? rad, rBot ?? rad, h, seg]} />
    <Mat c={c} e={e} o={o} m={m} />
  </mesh>
);

export const Sp = ({ p = [0, 0, 0], rad = 0.5, c, sc = [1, 1, 1], e, o, m }) => (
  <mesh position={p} scale={sc} castShadow receiveShadow>
    <sphereGeometry args={[rad, 24, 18]} />
    <Mat c={c} e={e} o={o} m={m} />
  </mesh>
);

export const Co = ({ p = [0, 0, 0], rad = 0.5, h = 1, c, r = [0, 0, 0], seg = 24, e, o }) => (
  <mesh position={p} rotation={r} castShadow receiveShadow>
    <coneGeometry args={[rad, h, seg]} />
    <Mat c={c} e={e} o={o} />
  </mesh>
);

export const To = ({ p = [0, 0, 0], rad = 0.5, tube = 0.06, c, r = [0, 0, 0], e, o, m }) => (
  <mesh position={p} rotation={r} castShadow receiveShadow>
    <torusGeometry args={[rad, tube, 12, 28]} />
    <Mat c={c} e={e} o={o} m={m} />
  </mesh>
);
