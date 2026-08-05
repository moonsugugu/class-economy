import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float, OrbitControls } from '@react-three/drei';
import { B, Co, Cy, Sp, To } from './prims.jsx';
import { HERO_ITEM_MAP, normalizeHero } from '../lib/hero';

const RARITY_COLORS = {
  common: { main: '#64748b', light: '#cbd5e1', dark: '#334155', glow: '#e2e8f0' },
  rare: { main: '#0284c7', light: '#67e8f9', dark: '#075985', glow: '#a5f3fc' },
  elite: { main: '#7c3aed', light: '#c4b5fd', dark: '#4c1d95', glow: '#e9d5ff' },
  legendary: { main: '#d97706', light: '#fde68a', dark: '#92400e', glow: '#fef3c7' },
};

const tierOf = (item) => item ? Math.ceil(item.level / 5) : 0;
const paletteOf = (item, fallback) => RARITY_COLORS[item?.rarity] || fallback;
const RARITY_RANK = { common: 1, rare: 2, elite: 3, legendary: 4 };

function HeroRarityAura({ hero }) {
  const groupRef = useRef();
  const items = [
    HERO_ITEM_MAP[hero.character],
    ...Object.values(hero.equipment || {}).map((id) => HERO_ITEM_MAP[id]),
    HERO_ITEM_MAP[hero.pet],
  ].filter(Boolean);
  const item = items.sort((a, b) => (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0))[0];
  const rank = RARITY_RANK[item?.rarity] || 0;
  const palette = RARITY_COLORS[item?.rarity] || RARITY_COLORS.common;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * (rank === 4 ? 0.5 : 0.25);
    groupRef.current.rotation.z = Math.sin(t * 1.4) * 0.03;
    groupRef.current.scale.setScalar(1 + Math.sin(t * 2.3) * (rank === 4 ? 0.06 : 0.03));
  });
  if (rank < 3) return null;

  return (
    <group ref={groupRef} position={[0, 0.72, -0.24]}>
      <pointLight color={palette.glow} intensity={rank === 4 ? 2.3 : 1.15} distance={2.7} />
      <Sp p={[0, 0, 0]} rad={0.86} sc={[0.78, 1.28, 0.4]} c={palette.glow} e={palette.glow} o={rank === 4 ? 0.1 : 0.07} />
      <To p={[0, 0, 0.1]} rad={0.72} tube={0.018} c={palette.light} e={palette.glow} r={[Math.PI / 2, 0, 0]} />
      {rank === 4 && [-1, 1].map((side) => (
        <group key={side} position={[side * 0.42, 0.1, 0.1]} rotation={[0, 0, side * 0.45]}>
          <Co p={[0, 0, 0]} rad={0.08} h={0.28} c={palette.light} e={palette.glow} />
          <Sp p={[0, 0.17, 0]} rad={0.035} c="#fff" e={palette.glow} />
        </group>
      ))}
    </group>
  );
}

function HeroFace({ female, skin, hair }) {
  return (
    <>
      {/* 뒤통수에도 머리 덮개를 먼저 깔아 카메라를 돌렸을 때 피부색 대머리처럼 보이지 않게 해요. */}
      <Sp p={[0, 1.02, -0.29]} rad={0.31} sc={[1.08, 1.12, 0.48]} c={hair} />
      <Sp p={[0, 1.02, 0]} rad={0.3} sc={[0.95, 1.04, 0.9]} c={skin} />
      <Sp p={[-0.11, 1.07, 0.255]} rad={0.052} c="#fff" />
      <Sp p={[0.11, 1.07, 0.255]} rad={0.052} c="#fff" />
      <Sp p={[-0.105, 1.07, 0.292]} rad={0.032} c="#1e293b" />
      <Sp p={[0.105, 1.07, 0.292]} rad={0.032} c="#1e293b" />
      <Sp p={[-0.095, 1.09, 0.316]} rad={0.012} c="#fff" e="#fff" />
      <Sp p={[0.115, 1.09, 0.316]} rad={0.012} c="#fff" e="#fff" />
      <Sp p={[0, 0.99, 0.28]} rad={0.022} c="#c47d70" />
      <Sp p={[-0.23, 1.02, 0.14]} rad={0.065} sc={[1.1, 0.55, 0.3]} c="#fda4af" />
      <Sp p={[0.23, 1.02, 0.14]} rad={0.065} sc={[1.1, 0.55, 0.3]} c="#fda4af" />
      <Sp p={[0, 1.29, -0.015]} rad={0.28} sc={[1.05, 0.42, 0.86]} c={hair} />
      {female ? (
        <group>
          {/* 뒤통수까지 이어지는 긴 머리 — 몸 뒤쪽을 덮어 대머리처럼 보이지 않게 해요. */}
          <Sp p={[0, 0.7, -0.27]} rad={0.28} sc={[1.28, 1.95, 0.62]} c={hair} />
          <Sp p={[-0.3, 0.68, -0.17]} rad={0.12} sc={[0.85, 2.6, 0.72]} c={hair} />
          <Sp p={[0.3, 0.68, -0.17]} rad={0.12} sc={[0.85, 2.6, 0.72]} c={hair} />
          <Sp p={[-0.24, 1.08, -0.02]} rad={0.105} sc={[0.75, 1.65, 0.78]} c={hair} />
          <Sp p={[0.24, 1.08, -0.02]} rad={0.105} sc={[0.75, 1.65, 0.78]} c={hair} />
          <Sp p={[-0.31, 0.78, -0.06]} rad={0.13} sc={[0.78, 1.75, 0.68]} c={hair} />
          <Sp p={[0.31, 0.78, -0.06]} rad={0.13} sc={[0.78, 1.75, 0.68]} c={hair} />
          <Sp p={[0, 1.34, -0.12]} rad={0.17} sc={[0.9, 0.5, 0.75]} c={hair} />
        </group>
      ) : (
        <group>
          <Sp p={[0, 1.0, -0.28]} rad={0.29} sc={[1.05, 1.18, 0.5]} c={hair} />
          <Sp p={[-0.2, 1.18, 0.03]} rad={0.08} sc={[0.7, 0.7, 0.65]} c={hair} />
          <Sp p={[0.2, 1.18, 0.03]} rad={0.08} sc={[0.7, 0.7, 0.65]} c={hair} />
        </group>
      )}
    </>
  );
}

function HeroHelmet({ item, female, hair }) {
  const tier = tierOf(item);
  if (!item) return null;
  const p = paletteOf(item, RARITY_COLORS.common);
  return (
    <group>
      {tier === 1 && (
        <group>
          <Sp p={[0, 1.35, 0]} rad={0.31} sc={[1.08, 0.55, 0.94]} c={p.main} />
          <B p={[0, 1.22, 0.22]} s={[0.62, 0.075, 0.08]} c={p.dark} />
          <Co p={[0, 1.61, 0]} rad={0.08} h={0.2} c={female ? '#fb7185' : '#38bdf8'} />
        </group>
      )}
      {tier === 2 && (
        <group>
          <Cy p={[0, 1.38, 0]} rTop={0.29} rBot={0.36} h={0.27} c={p.main} seg={24} m={0.65} />
          <B p={[0, 1.23, 0.24]} s={[0.7, 0.08, 0.09]} c={p.dark} m={0.6} />
          <B p={[-0.23, 1.37, 0.05]} s={[0.07, 0.23, 0.24]} c={p.light} m={0.6} />
          <B p={[0.23, 1.37, 0.05]} s={[0.07, 0.23, 0.24]} c={p.light} m={0.6} />
        </group>
      )}
      {tier === 3 && (
        <group>
          <Sp p={[0, 1.38, 0]} rad={0.34} sc={[1.08, 0.72, 0.98]} c={p.main} m={0.6} />
          <B p={[0, 1.19, 0.24]} s={[0.75, 0.11, 0.1]} c={p.dark} m={0.6} />
          <B p={[0, 1.4, 0.28]} s={[0.13, 0.28, 0.08]} c={p.light} m={0.65} />
          <Co p={[0, 1.73, 0]} rad={0.08} h={0.22} c={p.light} e={p.glow} />
        </group>
      )}
      {tier >= 4 && (
        <group>
          <Sp p={[0, 1.38, 0]} rad={0.35} sc={[1.12, 0.72, 1]} c={p.main} m={0.7} />
          <B p={[0, 1.18, 0.25]} s={[0.8, 0.12, 0.1]} c={p.dark} m={0.7} />
          {[-1, 1].map((s) => <Co key={s} p={[s * 0.24, 1.58, 0]} rad={0.075} h={0.32} c={p.light} e={p.glow} r={[0, 0, s * 0.38]} />)}
          <Co p={[0, 1.75, 0.02]} rad={0.1} h={0.24} c={p.light} e={p.glow} />
          <Sp p={[0, 1.45, 0.3]} rad={0.045} c={p.glow} e={p.glow} />
        </group>
      )}
      <Sp p={[0, 1.29, -0.03]} rad={0.27} sc={[1.04, 0.34, 0.84]} c={hair} o={0.35} />
    </group>
  );
}

function HeroArmor({ item }) {
  const tier = tierOf(item);
  const p = paletteOf(item, { main: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', glow: '#dbeafe' });
  return (
    <group>
      <Sp p={[0, 0.61, 0]} rad={0.32} sc={[1.02, 1.12, 0.76]} c={p.main} m={tier > 1 ? 0.5 : 0.15} />
      <Sp p={[0, 0.68, 0.23]} rad={0.2} sc={[1.08, 0.88, 0.25]} c={p.light} />
      <B p={[0, 0.39, 0.22]} s={[0.53, 0.09, 0.07]} c={p.dark} m={0.4} />
      {tier >= 2 && (
        <group>
          <B p={[-0.26, 0.64, 0.08]} s={[0.11, 0.28, 0.3]} c={p.dark} m={0.55} />
          <B p={[0.26, 0.64, 0.08]} s={[0.11, 0.28, 0.3]} c={p.dark} m={0.55} />
          <To p={[0, 0.66, 0.29]} rad={0.1} tube={0.018} c={p.glow} e={p.glow} />
        </group>
      )}
      {tier >= 3 && (
        <group>
          {[-1, 1].map((s) => <Sp key={s} p={[s * 0.36, 0.75, 0]} rad={0.15} sc={[1.2, 0.75, 0.8]} c={p.main} m={0.65} />)}
          <B p={[0, 0.66, 0.29]} s={[0.08, 0.27, 0.06]} c={p.glow} e={p.glow} />
          <B p={[0, 0.66, 0.29]} s={[0.27, 0.08, 0.06]} c={p.glow} e={p.glow} />
        </group>
      )}
      {tier >= 4 && (
        <group>
          <B p={[0, 0.58, -0.31]} s={[0.5, 0.8, 0.04]} c={p.dark} o={0.92} />
          {[-1, 1].map((s) => <Co key={s} p={[s * 0.2, 0.85, 0.03]} rad={0.06} h={0.22} c={p.light} e={p.glow} r={[0, 0, s * 0.45]} />)}
        </group>
      )}
    </group>
  );
}

function HeroGloves({ item }) {
  if (!item) return null;
  const tier = tierOf(item);
  const p = paletteOf(item, RARITY_COLORS.common);
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.39, 0.34, 0.14]} rotation={[0, 0, side * 0.12]}>
          <Sp p={[0, 0, 0]} rad={0.095} sc={[0.82, 1.05, 0.78]} c={p.main} m={tier > 1 ? 0.65 : 0.2} />
          <B p={[0, 0.015, 0.08]} s={[0.13, 0.12, 0.08]} c={p.light} />
          {tier >= 3 && <Sp p={[0, 0.02, 0.14]} rad={0.035} c={p.glow} e={p.glow} />}
          {tier >= 4 && <To p={[0, 0, 0.1]} rad={0.13} tube={0.012} c={p.glow} e={p.glow} />}
        </group>
      ))}
    </group>
  );
}

function HeroShoes({ item }) {
  const tier = tierOf(item);
  const p = paletteOf(item, { main: '#334155', light: '#64748b', dark: '#1e293b', glow: '#cbd5e1' });
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Sp p={[s * 0.14, 0.12, 0.05]} rad={0.14} sc={[0.95, 0.55, 1.25]} c={p.main} m={tier > 1 ? 0.55 : 0.15} />
          <B p={[s * 0.14, 0.12, 0.17]} s={[0.19, 0.1, 0.13]} c={p.light} />
          {tier >= 3 && <Co p={[s * 0.14, 0.24, 0]} rad={0.07} h={0.2} c={p.glow} e={p.glow} r={[0.25, 0, 0]} />}
          {tier >= 4 && <Sp p={[s * 0.14, 0.06, 0.2]} rad={0.04} c={p.glow} e={p.glow} />}
        </group>
      ))}
    </group>
  );
}

function HeroWeapon({ item }) {
  if (!item) return null;
  const tier = tierOf(item);
  const p = paletteOf(item, RARITY_COLORS.common);
  return (
    <group position={[0.5, 0.48, 0.16]} rotation={[0, 0, -0.48]}>
      <B p={[0, -0.1, 0]} s={[0.1, 0.26, 0.09]} c="#7c4a2d" m={0.2} />
      {tier === 1 && <B p={[0, 0.26, 0]} s={[0.075, 0.53, 0.055]} c={p.light} m={0.6} />}
      {tier === 2 && (
        <group>
          <Cy p={[0, 0.28, 0]} rad={0.035} h={0.7} c={p.light} m={0.7} />
          <Co p={[0, 0.68, 0]} rad={0.1} h={0.22} c={p.glow} e={p.glow} />
          <B p={[0, 0.02, 0]} s={[0.22, 0.05, 0.08]} c={p.dark} />
        </group>
      )}
      {tier === 3 && (
        <group>
          <B p={[0, 0.28, 0]} s={[0.17, 0.65, 0.07]} c={p.main} m={0.75} />
          <Co p={[0, 0.72, 0]} rad={0.12} h={0.3} c={p.light} e={p.glow} />
          <B p={[0, 0.02, 0]} s={[0.28, 0.06, 0.08]} c={p.dark} />
        </group>
      )}
      {tier >= 4 && (
        <group>
          <B p={[0, 0.3, 0]} s={[0.2, 0.78, 0.08]} c={p.light} m={0.8} e={p.glow} />
          <Co p={[0, 0.83, 0]} rad={0.15} h={0.36} c={p.glow} e={p.glow} />
          <B p={[0, 0.02, 0]} s={[0.34, 0.07, 0.1]} c={p.dark} />
          <Sp p={[0, 0.42, 0.06]} rad={0.045} c="#fff" e={p.glow} />
        </group>
      )}
    </group>
  );
}

function HeroAccessory({ item }) {
  if (!item) return null;
  const tier = tierOf(item);
  const p = paletteOf(item, RARITY_COLORS.common);
  return (
    <group position={[0, 0.46, 0.34]}>
      <To p={[0, 0.04, 0]} rad={0.09} tube={0.018} c={p.light} m={0.7} />
      <Sp p={[0, -0.01, 0.035]} rad={tier >= 3 ? 0.09 : 0.065} c={p.main} e={tier >= 4 ? p.glow : undefined} />
      {tier >= 2 && <Sp p={[0, 0.18, 0]} rad={0.035} c={p.glow} e={p.glow} />}
      {tier >= 4 && (
        <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.25}>
          <group position={[0, 0.36, 0]}>
            <Co p={[0, 0, 0]} rad={0.08} h={0.17} c={p.light} e={p.glow} />
            <To p={[0, 0, 0]} rad={0.12} tube={0.012} c={p.glow} e={p.glow} />
          </group>
        </Float>
      )}
    </group>
  );
}

function HeroPet({ item }) {
  const petRef = useRef();
  const palette = RARITY_COLORS[item?.rarity] || RARITY_COLORS.common;
  useFrame(({ clock }) => {
    if (!petRef.current) return;
    const t = clock.getElapsedTime();
    petRef.current.position.y = 0.3 + Math.sin(t * 3.2) * 0.08;
    petRef.current.rotation.y = Math.sin(t * 1.8) * 0.25;
  });
  if (!item) return null;
  return (
    <group ref={petRef} position={[0.92, 0.3, 0.1]} scale={0.46}>
      <pointLight color={palette.glow} intensity={item.rarity === 'legendary' ? 1.4 : 0.5} distance={1.8} />
      <Sp p={[0, 0, 0]} rad={0.36} sc={[1, 0.9, 0.85]} c={palette.main} m={0.45} />
      <Sp p={[-0.16, 0.27, 0]} rad={0.13} sc={[0.72, 1.15, 0.65]} c={palette.light} />
      <Sp p={[0.16, 0.27, 0]} rad={0.13} sc={[0.72, 1.15, 0.65]} c={palette.light} />
      <Sp p={[-0.1, 0.07, 0.3]} rad={0.04} c="#111827" />
      <Sp p={[0.1, 0.07, 0.3]} rad={0.04} c="#111827" />
      <Sp p={[0, -0.09, 0.3]} rad={0.04} c={palette.glow} e={palette.glow} />
      <To p={[0, 0, 0]} rad={0.48} tube={0.018} c={palette.light} e={palette.glow} />
    </group>
  );
}

function HeroFigure({ rawHero, animated = false, action = 'idle' }) {
  const figureRef = useRef();
  const hero = normalizeHero(rawHero);
  const female = hero.character === 'hero_female';
  const helmet = HERO_ITEM_MAP[hero.equipment.helmet];
  const weapon = HERO_ITEM_MAP[hero.equipment.weapon];
  const armor = HERO_ITEM_MAP[hero.equipment.armor];
  const gloves = HERO_ITEM_MAP[hero.equipment.gloves];
  const shoes = HERO_ITEM_MAP[hero.equipment.shoes];
  const accessory = HERO_ITEM_MAP[hero.equipment.accessory];
  const skin = female ? '#f4c7b3' : '#edb38e';
  const hair = female ? '#68452e' : '#3f2d20';
  const armorPalette = paletteOf(armor, { main: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', glow: '#dbeafe' });

  useFrame(({ clock }) => {
    if (!animated || !figureRef.current) return;
    const t = clock.getElapsedTime();
    const figure = figureRef.current;
    const baseY = -1.18;
    const idle = Math.sin(t * 2.2) * 0.018;
    figure.position.y = baseY + idle;
    figure.position.x = 0;
    figure.position.z = 0;
    figure.rotation.y = Math.sin(t * 1.4) * 0.035;
    figure.rotation.z = Math.sin(t * 1.8) * 0.018;
    figure.scale.setScalar(1.28);

    if (action === 'charge') {
      figure.position.y = baseY + Math.sin(t * 8) * 0.025;
      figure.scale.setScalar(1.28 + Math.sin(t * 10) * 0.025);
    }
    if (action === 'attack') {
      figure.position.x = Math.sin(t * 16) * 0.065;
      figure.position.z = Math.abs(Math.sin(t * 8)) * 0.07;
      figure.rotation.y = Math.sin(t * 12) * 0.14;
      figure.rotation.z = Math.sin(t * 16) * 0.045;
    }
    if (action === 'hit') {
      figure.position.x = Math.sin(t * 28) * 0.055;
      figure.rotation.z = Math.sin(t * 24) * 0.08;
    }
    if (action === 'win') {
      figure.position.y = baseY + Math.abs(Math.sin(t * 4)) * 0.11;
      figure.rotation.z = Math.sin(t * 5) * 0.07;
    }
    if (action === 'lose') {
      figure.rotation.z = -0.16 + Math.sin(t * 2) * 0.025;
      figure.position.y = baseY - 0.025;
    }
  });

  return (
    <group ref={figureRef} position={[0, -1.18, 0]} scale={1.28}>
      <HeroShoes item={shoes} />
      <HeroRarityAura hero={hero} />
      {/* 어린 용사의 실루엣: 큰 머리, 짧은 팔다리, 넓은 어깨로 기존 노인 느낌을 없앴어요. */}
      <Sp p={[-0.14, 0.36, 0]} rad={0.14} sc={[0.82, 1.5, 0.82]} c="#26364f" />
      <Sp p={[0.14, 0.36, 0]} rad={0.14} sc={[0.82, 1.5, 0.82]} c="#26364f" />
      <Sp p={[0, 0.59, 0]} rad={0.18} sc={[1.28, 1.7, 0.95]} c={armorPalette.dark} />
      <HeroArmor item={armor} />
      <Sp p={[-0.38, 0.54, 0.02]} rad={0.12} sc={[0.8, 1.3, 0.85]} c={armorPalette.main} r={[0, 0, -0.22]} />
      <Sp p={[0.38, 0.54, 0.02]} rad={0.12} sc={[0.8, 1.3, 0.85]} c={armorPalette.main} r={[0, 0, 0.22]} />
      <Sp p={[-0.39, 0.34, 0.1]} rad={0.085} c={skin} />
      <Sp p={[0.39, 0.34, 0.1]} rad={0.085} c={skin} />
      <HeroGloves item={gloves} />
      <HeroWeapon item={weapon} />
      <HeroAccessory item={accessory} />
      <HeroPet item={HERO_ITEM_MAP[hero.pet]} />
      <HeroFace female={female} skin={skin} hair={hair} />
      <HeroHelmet item={helmet} female={female} hair={hair} />
    </group>
  );
}

function HeroStage() {
  return (
    <>
      <mesh position={[0, -1.36, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.35, 48]} />
        <meshStandardMaterial color="#c7d2fe" roughness={0.9} />
      </mesh>
      <mesh position={[0, -1.29, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.88, 1.05, 48]} />
        <meshStandardMaterial color="#a5b4fc" emissive="#818cf8" emissiveIntensity={0.25} />
      </mesh>
    </>
  );
}

export default function HeroPreview({ hero, size = 180, animated = false, action = 'idle' }) {
  return (
    <div className="relative overflow-hidden rounded-[1.6rem] border border-white/70 bg-gradient-to-b from-sky-100 via-indigo-100 to-violet-200 shadow-inner" style={{ width: size, height: size }}>
      <Canvas shadows camera={{ position: [2.8, 1.6, 5.6], fov: 37 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#dbeafe']} />
        <ambientLight intensity={1.35} />
        <directionalLight castShadow position={[3, 5, 4]} intensity={2.4} shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, 2, -2]} intensity={0.75} color="#c4b5fd" />
        <pointLight position={[0, 1.7, 1.5]} intensity={1.2} color="#fef3c7" />
        <HeroStage />
        <HeroFigure rawHero={hero} animated={animated} action={action} />
        <ContactShadows position={[0, -1.34, 0]} opacity={0.32} scale={2.45} blur={2.5} far={2.4} />
        <OrbitControls
          enablePan={false}
          minDistance={3.6}
          maxDistance={6.8}
          minPolarAngle={Math.PI / 2.9}
          maxPolarAngle={Math.PI / 1.75}
          target={[0, 0.15, 0]}
        />
      </Canvas>
    </div>
  );
}
