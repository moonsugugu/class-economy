import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { B, Co, Sp } from './prims.jsx';
import { HERO_ITEM_MAP, normalizeHero } from '../lib/hero';

const RARITY_COLOR = {
  common: '#94a3b8',
  rare: '#38bdf8',
  elite: '#a78bfa',
  legendary: '#f59e0b',
};

const colorOf = (item, fallback) => item ? RARITY_COLOR[item.rarity] || fallback : fallback;

function HeroFigure({ rawHero }) {
  const hero = normalizeHero(rawHero);
  const character = HERO_ITEM_MAP[hero.character];
  const female = hero.character === 'hero_female';
  const helmet = HERO_ITEM_MAP[hero.equipment.helmet];
  const weapon = HERO_ITEM_MAP[hero.equipment.weapon];
  const armor = HERO_ITEM_MAP[hero.equipment.armor];
  const shoes = HERO_ITEM_MAP[hero.equipment.shoes];
  const accessory = HERO_ITEM_MAP[hero.equipment.accessory];
  const skin = female ? '#f3c7ad' : '#e8b58e';
  const hair = female ? '#5b3825' : '#3f2d20';
  const armorColor = colorOf(armor, '#4f6fa8');
  const helmetColor = colorOf(helmet, '#64748b');
  const shoeColor = colorOf(shoes, '#334155');
  const weaponColor = colorOf(weapon, '#e2e8f0');

  return (
    <group position={[0, -1.05, 0]} scale={1.35}>
      {/* 다리와 신발 */}
      <B p={[-0.12, 0.25, 0]} s={[0.13, 0.42, 0.16]} c="#26364f" />
      <B p={[0.12, 0.25, 0]} s={[0.13, 0.42, 0.16]} c="#26364f" />
      <Sp p={[-0.12, 0.04, 0.06]} rad={0.12} sc={[0.8, 0.55, 1.25]} c={shoeColor} />
      <Sp p={[0.12, 0.04, 0.06]} rad={0.12} sc={[0.8, 0.55, 1.25]} c={shoeColor} />

      {/* 갑옷을 입은 몸통 */}
      <Sp p={[0, 0.58, 0]} rad={0.3} sc={[0.95, 1.15, 0.72]} c={armorColor} />
      <B p={[0, 0.6, 0.2]} s={[0.4, 0.34, 0.08]} c={armor ? armorColor : '#64748b'} />
      <Sp p={[-0.34, 0.55, 0]} rad={0.1} sc={[0.7, 1.3, 0.75]} c={armorColor} />
      <Sp p={[0.34, 0.55, 0]} rad={0.1} sc={[0.7, 1.3, 0.75]} c={armorColor} />
      {accessory && <B p={[0, 0.52, -0.3]} s={[0.42, 0.6, 0.04]} c={colorOf(accessory, '#7c3aed')} />}

      {/* 손과 무기 */}
      <Sp p={[-0.38, 0.35, 0.08]} rad={0.09} c={skin} />
      <Sp p={[0.38, 0.35, 0.08]} rad={0.09} c={skin} />
      {weapon && (
        <group position={[0.48, 0.57, 0.12]} rotation={[0, 0, -0.45]}>
          <B p={[0, 0.18, 0]} s={[0.045, 0.42, 0.045]} c={weaponColor} m={0.5} />
          <B p={[0, -0.05, 0]} s={[0.16, 0.04, 0.05]} c="#8b5e34" />
        </group>
      )}

      {/* 소년·소녀 얼굴 */}
      <Sp p={[0, 1.08, 0]} rad={0.29} sc={[0.92, 1.05, 0.9]} c={skin} />
      <Sp p={[-0.11, 1.09, 0.25]} rad={0.045} c="#111827" />
      <Sp p={[0.11, 1.09, 0.25]} rad={0.045} c="#111827" />
      <Sp p={[-0.1, 1.105, 0.28]} rad={0.012} c="#ffffff" />
      <Sp p={[0.12, 1.105, 0.28]} rad={0.012} c="#ffffff" />
      <Sp p={[0, 0.99, 0.26]} rad={0.025} c="#9d5d54" />
      <Sp p={[0, 0.94, 0.25]} rad={0.018} sc={[1.8, 0.45, 0.5]} c="#9d4b54" />

      {/* 머리카락 또는 헬멧 */}
      {helmet ? (
        <group>
          <Sp p={[0, 1.31, 0]} rad={0.3} sc={[1.02, 0.48, 0.95]} c={helmetColor} />
          <B p={[0, 1.19, 0.23]} s={[0.54, 0.07, 0.08]} c={helmetColor} />
        </group>
      ) : (
        <group>
          <Sp p={[0, 1.29, -0.02]} rad={0.26} sc={[1.04, 0.38, 0.9]} c={hair} />
          {female && <Sp p={[0.22, 1.03, -0.02]} rad={0.11} sc={[0.75, 1.45, 0.85]} c={hair} />}
        </group>
      )}
      {character && <Co p={[0, 1.52, 0]} rad={0.045} h={0.12} c={female ? '#f472b6' : '#60a5fa'} />}
    </group>
  );
}

export default function HeroPreview({ hero, size = 180 }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-sky-50 to-indigo-100" style={{ width: size, height: size }}>
      <Canvas camera={{ position: [1.8, 1.25, 3.2], fov: 32 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 4, 4]} intensity={2} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />
        <HeroFigure rawHero={hero} />
        <OrbitControls enablePan={false} minDistance={2.5} maxDistance={4} minPolarAngle={Math.PI / 2.7} maxPolarAngle={Math.PI / 1.8} />
      </Canvas>
    </div>
  );
}

