import { HERO_GRADE_VISUALS, HERO_RARITIES } from '../lib/hero';
import HeroCharacterArt from './HeroCharacterArt.jsx';

const SLOT_LABELS = {
  helmet: '머리', weapon: '무기', armor: '갑옷', gloves: '장갑',
  shoes: '신발', accessory: '장신구', character: '용사', pet: '펫',
};

const DEFAULT_TONE = { main: '#5964d8', accent: '#22d3ee', glow: '#a5f3fc', dark: '#151a4e' };

function toneOf(item) {
  return { ...DEFAULT_TONE, ...(item?.visual || {}) };
}

function idPart(value) {
  return String(value || 'item').replace(/[^a-z0-9_-]/gi, '');
}

function ArtDefs({ uid, tone }) {
  return (
    <defs>
      <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={tone.glow} />
        <stop offset=".24" stopColor={tone.main} />
        <stop offset=".72" stopColor={tone.dark} />
        <stop offset="1" stopColor={tone.accent} />
      </linearGradient>
      <linearGradient id={`${uid}-shine`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor={tone.accent} />
        <stop offset=".48" stopColor={tone.glow} />
        <stop offset="1" stopColor="#fff" />
      </linearGradient>
      <radialGradient id={`${uid}-core`} cx="35%" cy="25%">
        <stop offset="0" stopColor="#fff" />
        <stop offset=".28" stopColor={tone.glow} />
        <stop offset="1" stopColor={tone.accent} />
      </radialGradient>
      <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );
}

function TierDecor({ tier, tone, uid }) {
  if (tier < 3) return null;
  if (tier === 3) {
    return <path d="M18 18L22 12L26 18M94 18L98 12L102 18" fill="none" stroke={tone.accent} strokeWidth="2.5" strokeLinecap="round" />;
  }
  if (tier === 4) {
    return (
      <g fill={`url(#${uid}-core)`} stroke={tone.glow} strokeWidth="1.5" filter={`url(#${uid}-glow)`}>
        <path d="M14 22L20 13L26 22L20 28Z" />
        <path d="M94 22L100 13L106 22L100 28Z" />
      </g>
    );
  }
  return (
    <g fill="none" stroke={tone.glow} strokeWidth="1.4" opacity=".95" filter={`url(#${uid}-glow)`}>
      <circle cx="60" cy="59" r="47" strokeDasharray="2 7" />
      <path d="M22 26L28 19L34 26M86 26L92 19L98 26" />
    </g>
  );
}

function HelmetArt({ item, tone, uid, tier }) {
  const design = item.visual?.design || 'visor';
  const family = design.includes('crown') || design.includes('royal') || design.includes('halo') || design.includes('crest')
    ? 'crown'
    : design.includes('horn') || design.includes('antler') || design.includes('dragon')
      ? 'horn'
      : design.includes('hood') || design.includes('mask') || design.includes('headband')
        ? 'hood'
        : design.includes('sail') || design.includes('storm')
          ? 'sail'
          : 'visor';
  return (
    <g stroke={tone.accent} strokeWidth="2.5" strokeLinejoin="round">
      {family === 'hood' && <path d="M26 70C22 35 36 18 60 16C84 18 98 35 94 70L83 91H37Z" fill={`url(#${uid}-metal)`} />}
      {family === 'sail' && <path d="M28 73L31 30L55 13L89 27L94 73L77 91H42Z" fill={`url(#${uid}-metal)`} />}
      {family === 'crown' && <path d="M23 71L29 32L42 48L60 19L78 48L91 32L97 71L82 91H38Z" fill={`url(#${uid}-metal)`} />}
      {family === 'horn' && <path d="M25 73C22 42 35 20 60 17C85 20 98 42 95 73L81 91H39Z" fill={`url(#${uid}-metal)`} />}
      {family === 'visor' && <path d="M25 70C24 37 39 20 60 18C81 20 96 37 95 70L82 91H38Z" fill={`url(#${uid}-metal)`} />}
      {family === 'horn' && (
        <g fill={`url(#${uid}-shine)`}>
          <path d="M31 40L18 18L42 28Z" />
          <path d="M89 40L102 18L78 28Z" />
        </g>
      )}
      {family === 'sail' && <path d="M56 17L60 4L66 25Z" fill={tone.glow} />}
      {family === 'crown' && <path d="M46 37L60 9L74 37Z" fill={tone.glow} filter={`url(#${uid}-glow)`} />}
      <path d="M28 58C40 50 80 50 92 58L89 72C75 78 45 78 31 72Z" fill={tone.dark} />
      <path d="M33 61C47 58 73 58 87 61" fill="none" stroke={tone.glow} strokeWidth="2" />
      <path d="M43 76L60 84L77 76" fill="none" stroke={tone.glow} strokeWidth="2" />
      <TierDecor tier={tier} tone={tone} uid={uid} />
    </g>
  );
}

function WeaponArt({ item, tone, uid, tier }) {
  const design = item.visual?.design || 'blade';
  const family = design.includes('bow') || design.includes('arc')
    ? 'bow'
    : design.includes('axe') || design.includes('cleaver')
      ? 'axe'
      : design.includes('spear') || design.includes('lance')
        ? 'spear'
        : design.includes('staff') || design.includes('pulse') || design.includes('core')
          ? 'staff'
          : design.includes('dagger') || design.includes('cutter')
            ? 'dagger'
            : design.includes('great') || design.includes('breaker')
              ? 'greatsword'
              : 'blade';
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {family === 'bow' && (
        <g fill="none" stroke={tone.accent} strokeWidth="4">
          <path d="M30 15C12 40 12 80 30 105" />
          <path d="M30 15C64 42 64 78 30 105" stroke={tone.glow} strokeWidth="2" />
          <path d="M22 60H93M93 60L79 52M93 60L79 68" stroke={tone.glow} strokeWidth="3" />
        </g>
      )}
      {family === 'axe' && (
        <g>
          <path d="M63 16L58 94" stroke={tone.dark} strokeWidth="8" />
          <path d="M57 21C83 14 101 27 100 53C88 61 70 59 57 47Z" fill={`url(#${uid}-shine)`} stroke={tone.accent} strokeWidth="3" />
          <path d="M58 49C77 43 91 43 100 53" fill="none" stroke={tone.glow} strokeWidth="2" />
        </g>
      )}
      {family === 'spear' && (
        <g>
          <path d="M61 10L57 106" stroke={tone.dark} strokeWidth="7" />
          <path d="M61 8L79 35L61 63L43 35Z" fill={`url(#${uid}-shine)`} stroke={tone.accent} strokeWidth="3" />
          <path d="M53 38L61 25L69 38" fill="none" stroke="#fff" strokeWidth="2" />
        </g>
      )}
      {family === 'staff' && (
        <g>
          <path d="M61 22C36 36 42 58 59 67L56 105" fill="none" stroke={tone.dark} strokeWidth="7" />
          <circle cx="61" cy="23" r="18" fill={`url(#${uid}-core)`} stroke={tone.glow} strokeWidth="3" filter={`url(#${uid}-glow)`} />
          <path d="M50 23H72M61 12V34" stroke="#fff" strokeWidth="2" opacity=".7" />
        </g>
      )}
      {family === 'bow' ? null : family === 'axe' || family === 'spear' || family === 'staff' ? null : (
        <g>
          <path d={family === 'dagger' ? 'M61 8L80 54L66 82L60 108L54 82L40 54Z' : family === 'greatsword' ? 'M60 6L83 30L69 89L60 108L51 89L37 30Z' : 'M60 5L79 26L69 89L60 107L51 89L41 26Z'} fill={`url(#${uid}-shine)`} stroke={tone.accent} strokeWidth="3" />
          <path d="M60 11L60 91" stroke="#fff" strokeWidth="2" opacity=".75" />
          <path d="M35 88H85M51 88L60 101L69 88" stroke={tone.glow} strokeWidth="4" />
          <circle cx="60" cy="91" r="6" fill={tone.accent} stroke={tone.glow} strokeWidth="2" />
        </g>
      )}
      {tier >= 4 && <path d="M21 26L28 20L35 26M85 26L92 20L99 26" fill="none" stroke={tone.glow} strokeWidth="2" />}
      {tier >= 5 && <circle cx="60" cy="60" r="48" fill="none" stroke={tone.glow} strokeWidth="1.5" strokeDasharray="2 7" opacity=".8" />}
    </g>
  );
}

function ArmorArt({ item, tone, uid, tier }) {
  const design = item.visual?.design || 'plate';
  const robe = design.includes('coat') || design.includes('mail') || design.includes('shell') || design.includes('harness');
  const crystal = design.includes('crystal') || design.includes('star') || design.includes('nebula') || design.includes('sky');
  const dragon = design.includes('dragon') || design.includes('flame');
  return (
    <g stroke={tone.accent} strokeWidth="2.5" strokeLinejoin="round">
      <path d={robe ? 'M35 18L60 11L85 18L98 92L60 108L22 92Z' : 'M37 15L60 10L83 15L91 91L60 106L29 91Z'} fill={`url(#${uid}-metal)`} />
      <path d="M39 18L60 31L81 18L74 48L60 57L46 48Z" fill={tone.dark} />
      {dragon && <path d="M32 54L45 42L52 56L60 42L68 56L75 42L88 54L78 69L60 77L42 69Z" fill={tone.accent} opacity=".9" />}
      {crystal ? (
        <g fill={`url(#${uid}-core)`} filter={`url(#${uid}-glow)`}>
          <path d="M60 39L72 54L60 75L48 54Z" stroke={tone.glow} />
          <path d="M27 48L35 42L42 54L34 61Z" stroke={tone.glow} />
          <path d="M93 48L85 42L78 54L86 61Z" stroke={tone.glow} />
        </g>
      ) : (
        <path d="M60 38L73 55L60 75L47 55Z" fill={`url(#${uid}-core)`} stroke={tone.glow} />
      )}
      <path d="M27 82H93M37 92L60 101L83 92" fill="none" stroke={tone.glow} strokeWidth="2" />
      {tier >= 4 && <path d="M23 27L33 20L39 29M97 27L87 20L81 29" fill="none" stroke={tone.glow} strokeWidth="2.5" />}
      {tier >= 5 && <circle cx="60" cy="57" r="44" fill="none" stroke={tone.glow} strokeDasharray="2 6" opacity=".8" />}
    </g>
  );
}

function GlovesArt({ item, tone, uid, tier }) {
  const design = item.visual?.design || 'gauntlet';
  const claws = design.includes('fist') || design.includes('claw') || design.includes('dragon');
  const rune = design.includes('rune') || design.includes('sigil') || design.includes('nebula');
  return (
    <g stroke={tone.accent} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M18 67C19 47 28 31 40 30L49 54V21C49 14 58 14 60 21V51L63 18C64 11 73 13 72 21L70 53L76 26C78 19 86 22 84 29L77 59L91 44C96 39 101 45 98 51L78 79C72 90 55 96 38 88Z" fill={`url(#${uid}-metal)`} />
      <path d="M18 67C31 76 52 82 77 79" fill="none" stroke={tone.glow} />
      {claws && <path d="M77 59L88 73L83 93L75 77L65 93L60 77L48 91L46 70Z" fill={tone.accent} />}
      {rune && <g fill="none" stroke={tone.glow} strokeWidth="2"><circle cx="56" cy="57" r="14" /><path d="M56 43V71M42 57H70M47 48L65 66M65 48L47 66" /></g>}
      {tier >= 4 && <path d="M21 39L29 30L37 39M81 31L89 22L97 31" fill="none" stroke={tone.glow} strokeWidth="2" />}
      {tier >= 5 && <circle cx="56" cy="57" r="37" fill="none" stroke={tone.glow} strokeDasharray="2 6" opacity=".75" />}
    </g>
  );
}

function ShoesArt({ item, tone, uid, tier }) {
  const design = item.visual?.design || 'boot';
  const wing = design.includes('wing') || design.includes('runner') || design.includes('sky');
  const claw = design.includes('claw') || design.includes('dragon');
  const greave = design.includes('greave') || design.includes('knight') || design.includes('armor');
  return (
    <g stroke={tone.accent} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M25 16L50 22L52 70L83 82C91 85 94 94 87 101H35C24 98 19 88 21 74Z" fill={`url(#${uid}-metal)`} />
      <path d="M65 21L91 14L96 70L78 82L59 70Z" fill={`url(#${uid}-metal)`} opacity=".92" />
      {wing && <g fill={`url(#${uid}-shine)`}><path d="M26 53L7 34L29 40L13 20L43 36Z" /><path d="M79 47L102 29L87 51L109 45L88 61Z" /></g>}
      {claw && <path d="M35 73L26 98M50 75L46 101M66 76L72 99M81 73L91 94" stroke={tone.glow} strokeWidth="4" />}
      <path d="M22 65L51 69M61 68L91 63" fill="none" stroke={tone.glow} strokeWidth="3" />
      {greave && <path d="M31 28L46 33L45 61L30 57ZM67 27L84 23L87 57L70 62Z" fill={tone.dark} />}
      {tier >= 4 && <path d="M24 26L32 18L40 26M81 22L89 14L97 22" fill="none" stroke={tone.glow} strokeWidth="2" />}
      {tier >= 5 && <path d="M18 82C38 72 72 72 93 82" fill="none" stroke={tone.glow} strokeDasharray="2 6" />}
    </g>
  );
}

function AccessoryArt({ item, tone, uid, tier }) {
  const design = item.visual?.design || 'core';
  const ring = design.includes('ring') || design.includes('orbit') || design.includes('core');
  const crown = design.includes('crown') || design.includes('seal') || design.includes('royal');
  const pendant = design.includes('pendant') || design.includes('charm') || design.includes('gem');
  return (
    <g stroke={tone.accent} strokeWidth="2.5" strokeLinejoin="round">
      {ring && <><ellipse cx="60" cy="58" rx="39" ry="25" fill="none" stroke={tone.glow} strokeWidth="5" /><ellipse cx="60" cy="58" rx="23" ry="38" fill="none" stroke={tone.accent} transform="rotate(38 60 58)" /></>}
      {crown && <path d="M22 69L28 36L47 53L60 24L73 53L92 36L98 69L83 88H37Z" fill={`url(#${uid}-metal)`} />}
      {pendant && <path d="M60 18L79 48L60 92L41 48Z" fill={`url(#${uid}-core)`} stroke={tone.glow} filter={`url(#${uid}-glow)`} />}
      {!ring && !crown && !pendant && <path d="M60 15L79 34L93 60L79 86L60 103L41 86L27 60L41 34Z" fill={`url(#${uid}-metal)`} />}
      <path d="M60 37L73 58L60 79L47 58Z" fill={tone.dark} stroke={tone.glow} />
      <circle cx="60" cy="58" r="8" fill={`url(#${uid}-core)`} filter={`url(#${uid}-glow)`} />
      {tier >= 4 && <path d="M16 58H29M91 58H104M60 12V25M60 91V104" stroke={tone.glow} strokeWidth="2" />}
      {tier >= 5 && <circle cx="60" cy="58" r="47" fill="none" stroke={tone.glow} strokeDasharray="2 7" opacity=".8" />}
    </g>
  );
}

function PetFace({ tone, eyes = 'normal' }) {
  return (
    <g>
      <ellipse cx="45" cy="60" rx="5" ry="7" fill={tone.dark} />
      <ellipse cx="75" cy="60" rx="5" ry="7" fill={tone.dark} />
      {eyes === 'sleepy' && <path d="M39 60L50 60M70 60L81 60" stroke={tone.glow} strokeWidth="3" />}
      <path d="M53 73Q60 78 67 73" fill="none" stroke={tone.glow} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="60" cy="67" r="3" fill={tone.glow} />
    </g>
  );
}

function PetArt({ item, tone, uid, tier }) {
  const design = item.visual?.design || 'slime';
  const body = `url(#${uid}-metal)`;
  const glow = `url(#${uid}-core)`;
  let art;
  if (design === 'slime') art = <path d="M23 78C20 47 35 26 60 26S100 47 97 78C91 98 31 98 23 78Z" fill={body} />;
  else if (design === 'fox' || design === 'wolf' || design === 'cat') art = <><path d="M28 49L24 17L48 33C56 30 64 30 72 33L96 17L92 50L84 83C74 98 46 98 36 83Z" fill={body} /><path d="M27 78C7 77 9 52 28 58" fill="none" stroke={tone.glow} strokeWidth="7" /></>;
  else if (design === 'seal') art = <><ellipse cx="60" cy="62" rx="39" ry="31" fill={body} /><path d="M27 52L15 40M93 52L105 40" stroke={tone.accent} strokeWidth="8" strokeLinecap="round" /><ellipse cx="60" cy="35" rx="22" ry="12" fill={tone.accent} /></>;
  else if (design === 'panda' || design === 'monkey') art = <><circle cx="60" cy="59" r="36" fill={body} /><circle cx="31" cy="28" r="13" fill={tone.accent} /><circle cx="89" cy="28" r="13" fill={tone.accent} /><ellipse cx="40" cy="57" rx="10" ry="17" fill={tone.dark} transform="rotate(35 40 57)" /><ellipse cx="80" cy="57" rx="10" ry="17" fill={tone.dark} transform="rotate(-35 80 57)" /></>;
  else if (design === 'deer') art = <><path d="M30 51L28 24L42 34L52 17L60 34L68 17L78 34L92 24L90 51L80 84C70 98 50 98 40 84Z" fill={body} /><path d="M34 21L24 9M42 27L39 8M86 21L96 9M78 27L81 8" stroke={tone.glow} strokeWidth="4" strokeLinecap="round" /></>;
  else if (design === 'hawk' || design === 'eagle') art = <><path d="M60 30C44 25 26 35 16 52L43 55L23 75L52 68L60 93L68 68L97 75L77 55L104 52C94 35 76 25 60 30Z" fill={body} /><path d="M60 38L60 82" stroke={tone.glow} strokeWidth="3" /></>;
  else if (design === 'turtle') art = <><ellipse cx="60" cy="61" rx="40" ry="29" fill={body} /><path d="M39 41L60 29L81 41L93 61L81 81L60 93L39 81L27 61Z" fill={tone.dark} stroke={tone.glow} strokeWidth="3" /><circle cx="60" cy="61" r="9" fill={glow} /></>;
  else if (design === 'penguin') art = <><ellipse cx="60" cy="61" rx="33" ry="40" fill={body} /><ellipse cx="60" cy="69" rx="22" ry="27" fill={tone.glow} /><path d="M47 24L60 10L73 24" fill={tone.accent} stroke={tone.glow} strokeWidth="2" /><path d="M49 74L29 91M71 74L91 91" stroke={tone.accent} strokeWidth="7" strokeLinecap="round" /></>;
  else if (design === 'dragon') art = <><path d="M31 50L29 18L48 32C56 28 64 28 72 32L91 18L89 50L81 84C70 98 50 98 39 84Z" fill={body} /><path d="M31 47L9 28L26 61M89 47L111 28L94 61" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M50 21L60 9L70 21" fill={tone.accent} stroke={tone.glow} strokeWidth="2" /></>;
  else if (design === 'owl') art = <><circle cx="60" cy="60" r="37" fill={body} /><circle cx="42" cy="55" r="19" fill={tone.glow} /><circle cx="78" cy="55" r="19" fill={tone.glow} /><path d="M60 57L70 69L60 76L50 69Z" fill={tone.accent} /><path d="M24 37L33 17L48 32M96 37L87 17L72 32" fill={tone.accent} stroke={tone.glow} strokeWidth="2" /></>;
  else if (design === 'lion') art = <><circle cx="60" cy="60" r="30" fill={body} stroke={tone.glow} strokeWidth="14" /><path d="M31 38L17 26M89 38L103 26M31 82L17 94M89 82L103 94" stroke={tone.accent} strokeWidth="7" strokeLinecap="round" /></>;
  else if (design === 'viper') art = <><path d="M31 78C15 68 22 39 44 44C67 49 54 81 81 78C100 76 99 47 82 41" fill="none" stroke={tone.accent} strokeWidth="18" strokeLinecap="round" /><path d="M31 78C15 68 22 39 44 44" fill="none" stroke={tone.glow} strokeWidth="3" /><path d="M76 35L94 30L84 47Z" fill={body} stroke={tone.glow} strokeWidth="2" /></>;
  else if (design === 'whale') art = <><path d="M18 65C25 31 75 27 101 59C83 90 38 96 18 65Z" fill={body} /><path d="M51 36C43 16 29 17 20 28C34 26 38 36 39 45" fill={tone.accent} /><path d="M77 61L105 47L96 66L105 80Z" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /></>;
  else if (design === 'unicorn') art = <><path d="M29 49L30 20L48 34C56 30 64 30 72 34L90 20L91 49L82 83C71 98 49 98 38 83Z" fill={body} /><path d="M60 33L61 3L72 31Z" fill={glow} stroke={tone.glow} strokeWidth="2" /><path d="M34 27L23 10M86 27L97 10" stroke={tone.accent} strokeWidth="4" /></>;
  else if (design === 'griffin') art = <><path d="M32 71L16 38L47 47C54 35 66 35 73 47L104 38L88 71L77 91H43Z" fill={body} /><path d="M46 25L60 13L74 25L60 39Z" fill={tone.accent} stroke={tone.glow} strokeWidth="2" /><path d="M26 71L15 85M94 71L105 85" stroke={tone.glow} strokeWidth="6" strokeLinecap="round" /></>;
  else art = <><path d="M29 82C24 62 32 38 47 35L60 14L73 35C88 38 96 62 91 82C79 99 41 99 29 82Z" fill={body} /><path d="M32 38L12 21L22 54M88 38L108 21L98 54" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M44 19L60 5L76 19" fill={tone.accent} stroke={tone.glow} strokeWidth="2" /></>;
  const eyes = design === 'owl' || design === 'penguin' ? 'sleepy' : 'normal';
  return (
    <g stroke={tone.accent} strokeWidth="2.5" strokeLinejoin="round">
      {art}
      <PetFace tone={tone} eyes={eyes} />
      {tier >= 4 && <circle cx="60" cy="60" r="48" fill="none" stroke={tone.glow} strokeWidth="2" strokeDasharray="2 7" opacity=".85" />}
      {tier >= 5 && <path d="M17 19L24 12L31 19M89 19L96 12L103 19" fill="none" stroke={tone.glow} strokeWidth="2" />}
    </g>
  );
}

function DesignSignature({ item, tone, uid }) {
  const design = item.visual?.design || '';
  const glow = tone.glow;
  const core = `url(#${uid}-core)`;
  const shine = `url(#${uid}-shine)`;

  if (item.slot === 'helmet') {
    const detail = {
      headband: <><path d="M27 51Q60 39 93 51" fill="none" stroke={glow} strokeWidth="5" /><path d="M31 49L20 42M89 49L100 42" stroke={tone.accent} strokeWidth="3" /></>,
      visor: <path d="M31 54Q60 45 89 54L85 62Q60 56 35 62Z" fill={core} stroke={glow} />,
      horn: <path d="M39 31L31 10M81 31L89 10" stroke={glow} strokeWidth="3" strokeLinecap="round" />,
      hood: <path d="M36 39Q60 25 84 39" fill="none" stroke={glow} strokeWidth="3" strokeDasharray="3 4" />,
      crown: <g fill={core} stroke={glow}><path d="M47 34L53 24L60 34L67 24L73 34Z" /><circle cx="60" cy="27" r="3" /></g>,
      halo: <circle cx="60" cy="35" r="25" fill="none" stroke={glow} strokeWidth="3" strokeDasharray="2 5" filter={`url(#${uid}-glow)`} />,
      mask: <path d="M34 67Q60 78 86 67L82 83Q60 92 38 83Z" fill={tone.dark} stroke={glow} />,
      crest: <><path d="M60 20L70 36L60 48L50 36Z" fill={shine} stroke={glow} /><path d="M60 27V42" stroke="#fff" strokeWidth="2" /></>,
      circlet: <ellipse cx="60" cy="35" rx="31" ry="9" fill="none" stroke={glow} strokeWidth="4" />,
      antler: <path d="M41 37L31 25L34 13M79 37L89 25L86 13M31 25L22 20M89 25L98 20" fill="none" stroke={glow} strokeWidth="3" strokeLinecap="round" />,
      sail: <path d="M31 35L11 23L32 53M89 35L109 23L88 53" fill="none" stroke={glow} strokeWidth="3" />,
      rune: <g fill="none" stroke={glow} strokeWidth="2"><circle cx="60" cy="38" r="14" /><path d="M60 24V52M46 38H74M51 29L69 47M69 29L51 47" /></g>,
      royal: <g fill={core} stroke={glow}><circle cx="44" cy="35" r="4" /><circle cx="60" cy="25" r="5" /><circle cx="76" cy="35" r="4" /></g>,
      'halo-crest': <><circle cx="60" cy="33" r="27" fill="none" stroke={glow} strokeWidth="2" /><path d="M60 20L69 37L60 47L51 37Z" fill={shine} stroke={glow} /></>,
      ancient: <g fill="none" stroke={glow} strokeWidth="2"><path d="M38 28L48 38L42 48M82 28L72 38L78 48M47 24L60 34L73 24" /></g>,
      dragon: <g fill={core} stroke={glow}><path d="M40 42L47 31L54 42Z" /><path d="M53 37L60 26L67 37Z" /><path d="M66 42L73 31L80 42Z" /></g>,
      flame: <path d="M48 42C43 31 54 29 56 17C65 28 70 33 66 45C61 39 56 39 48 42Z" fill={shine} stroke={glow} />,
      storm: <path d="M61 14L49 38H60L55 55L73 29H62Z" fill={shine} stroke={glow} />,
      constellation: <g fill={glow}><circle cx="43" cy="30" r="2" /><circle cx="60" cy="21" r="2" /><circle cx="77" cy="30" r="2" /><path d="M43 30L60 21L77 30" fill="none" stroke={glow} strokeWidth="1.5" /></g>,
      'sky-crown': <g fill={shine} stroke={glow}><path d="M35 39L20 24L42 31L60 13L78 31L100 24L85 39Z" /><path d="M60 13V4" /></g>,
    }[design];
    return <g strokeLinecap="round" strokeLinejoin="round">{detail}</g>;
  }

  if (item.slot === 'weapon') {
    const detail = {
      blade: <path d="M53 31L60 20L67 31" fill="none" stroke={glow} strokeWidth="3" />,
      dagger: <path d="M60 13L52 31L60 45L68 31Z" fill={core} stroke={glow} />,
      saber: <path d="M67 12Q90 43 67 83" fill="none" stroke={glow} strokeWidth="4" />,
      sword: <path d="M47 25H73M51 31H69" stroke={glow} strokeWidth="3" />,
      breaker: <path d="M43 38H77L72 48H48Z" fill={shine} stroke={glow} />,
      pulse: <><circle cx="60" cy="24" r="12" fill={core} stroke={glow} /><path d="M60 12V36M48 24H72" stroke="#fff" strokeWidth="2" /></>,
      edge: <path d="M55 13L72 42L60 82L48 42Z" fill="none" stroke={glow} strokeWidth="2" />,
      cutter: <path d="M45 27L51 35L45 43L51 51L45 59M75 27L69 35L75 43L69 51L75 59" fill="none" stroke={glow} strokeWidth="3" />,
      spear: <path d="M60 8L67 22L60 35L53 22Z" fill={shine} stroke={glow} />,
      axe: <path d="M58 25Q78 17 91 28Q78 39 58 35Z" fill={shine} stroke={glow} />,
      greatsword: <path d="M48 20L60 9L72 20" fill="none" stroke={glow} strokeWidth="4" />,
      'rune-blade': <g fill="none" stroke={glow} strokeWidth="2"><circle cx="60" cy="39" r="10" /><path d="M60 29V49M50 39H70M53 32L67 46M67 32L53 46" /></g>,
      'king-sword': <g fill={core} stroke={glow}><path d="M51 26L60 13L69 26Z" /><circle cx="60" cy="88" r="6" /></g>,
      greatblade: <path d="M43 34L53 25L60 9L67 25L77 34" fill="none" stroke={glow} strokeWidth="3" />,
      'ancient-edge': <path d="M49 25L55 32L60 24L66 32L72 25" fill="none" stroke={glow} strokeWidth="3" />,
      cleaver: <path d="M58 19L91 25L78 52L58 46Z" fill={shine} stroke={glow} />,
      buster: <><rect x="43" y="20" width="34" height="18" rx="4" fill={tone.dark} stroke={glow} /><circle cx="60" cy="29" r="6" fill={core} /></>,
      lance: <><path d="M60 7L76 27L60 48L44 27Z" fill={shine} stroke={glow} /><path d="M50 27H70" stroke="#fff" strokeWidth="2" /></>,
      bow: <path d="M26 60H94M86 52L94 60L86 68" fill="none" stroke={glow} strokeWidth="2" />,
      arc: <><path d="M37 33C78 36 88 62 70 88" fill="none" stroke={glow} strokeWidth="4" /><circle cx="60" cy="60" r="8" fill={core} stroke={glow} /></>,
    }[design];
    return <g strokeLinecap="round" strokeLinejoin="round">{detail}</g>;
  }

  if (item.slot === 'armor') {
    const detail = {
      vest: <path d="M35 42L24 61M85 42L96 61" stroke={glow} strokeWidth="4" />,
      mail: <g fill="none" stroke={glow} strokeWidth="2"><path d="M35 50H85M31 62H89M28 74H92" /><path d="M43 44V82M60 38V94M77 44V82" /></g>,
      scale: <g fill={core} stroke={glow}>{[0, 1, 2].map(row => [0, 1, 2, 3].map(col => <path key={`${row}-${col}`} d={`M${38 + col * 13} ${47 + row * 13}L${44 + col * 13} ${54 + row * 13}L${50 + col * 13} ${47 + row * 13}Z`} />))}</g>,
      plate: <path d="M35 44L44 36L51 47M85 44L76 36L69 47" fill={shine} stroke={glow} />,
      knight: <path d="M60 34L68 47L60 60L52 47Z" fill={shine} stroke={glow} />,
      shell: <path d="M36 39Q60 23 84 39M32 52Q60 36 88 52M29 66Q60 49 91 66" fill="none" stroke={glow} strokeWidth="3" />,
      harness: <path d="M38 29L82 83M82 29L38 83" fill="none" stroke={glow} strokeWidth="5" />,
      coat: <path d="M31 80L23 98L60 108L97 98L89 80" fill={tone.dark} stroke={glow} />,
      'rune-armor': <g fill="none" stroke={glow} strokeWidth="2"><circle cx="60" cy="58" r="15" /><path d="M60 43V73M45 58H75M50 48L70 68M70 48L50 68" /></g>,
      'crystal-plate': <g fill={shine} stroke={glow}><path d="M60 33L70 48L60 66L50 48Z" /><path d="M35 48L43 40L50 52L42 60Z" /><path d="M85 48L77 40L70 52L78 60Z" /></g>,
      sentinel: <g fill={tone.dark} stroke={glow}><path d="M26 35L40 30L48 45L32 52Z" /><path d="M94 35L80 30L72 45L88 52Z" /></g>,
      'nebula-mail': <g fill={glow}><circle cx="42" cy="45" r="2" /><circle cx="75" cy="51" r="2" /><circle cx="52" cy="78" r="2" /><circle cx="70" cy="84" r="1.5" /></g>,
      'royal-armor': <path d="M42 36H78L70 46H50Z" fill={shine} stroke={glow} />,
      'star-armor': <path d="M60 34L65 50L82 50L68 60L73 76L60 66L47 76L52 60L38 50L55 50Z" fill={core} stroke={glow} />,
      'ancient-armor': <g fill="none" stroke={glow} strokeWidth="2"><path d="M38 34L48 46L42 60L54 72L48 88M82 34L72 46L78 60L66 72L72 88" /></g>,
      'dragon-plate': <path d="M35 59L45 47L52 59L60 46L68 59L75 47L85 59L75 74L60 84L45 74Z" fill={tone.accent} stroke={glow} />,
      'flame-armor': <path d="M48 73C43 59 55 54 56 40C67 52 75 59 68 75C63 68 56 68 48 73Z" fill={shine} stroke={glow} />,
      'storm-armor': <path d="M63 36L48 60H60L54 82L75 51H63Z" fill={shine} stroke={glow} />,
      'constellation-coat': <g fill={glow}><circle cx="41" cy="45" r="2" /><circle cx="60" cy="36" r="2" /><circle cx="79" cy="45" r="2" /><path d="M41 45L60 36L79 45" fill="none" stroke={glow} strokeWidth="1.5" /></g>,
      'sky-armor': <path d="M38 43L17 31L31 56M82 43L103 31L89 56" fill="none" stroke={glow} strokeWidth="4" />,
    }[design];
    return <g strokeLinecap="round" strokeLinejoin="round">{detail}</g>;
  }

  if (item.slot === 'gloves') {
    const detail = {
      wrap: <path d="M29 62Q52 70 78 62" fill="none" stroke={glow} strokeWidth="5" />,
      glove: <path d="M44 32V53M54 26V53M64 26V53M74 32V53" stroke={glow} strokeWidth="2" />,
      knuckle: <g fill={core} stroke={glow}><circle cx="45" cy="49" r="5" /><circle cx="60" cy="51" r="5" /><circle cx="75" cy="49" r="5" /></g>,
      gauntlet: <path d="M35 43L46 51L43 65M85 43L74 51L77 65" fill="none" stroke={glow} strokeWidth="4" />,
      grip: <path d="M28 69L79 83M34 59L84 73M42 50L89 64" stroke={glow} strokeWidth="2" />,
      fist: <path d="M43 37L51 47L59 37L67 47L75 37" fill="none" stroke={glow} strokeWidth="4" />,
      'sigil-gauntlet': <g fill="none" stroke={glow} strokeWidth="2"><circle cx="56" cy="58" r="13" /><path d="M56 45V71M43 58H69M47 49L65 67M65 49L47 67" /></g>,
      'chain-knuckle': <path d="M40 58Q60 35 80 58Q60 82 40 58Z" fill="none" stroke={glow} strokeWidth="3" strokeDasharray="4 3" />,
      'rune-bracer': <g fill="none" stroke={glow} strokeWidth="2"><path d="M34 42L47 55L39 70M82 42L69 55L77 70" /><circle cx="56" cy="57" r="8" /></g>,
      'crystal-gauntlet': <g fill={shine} stroke={glow}><path d="M42 44L51 32L57 50L48 61Z" /><path d="M64 50L70 32L79 44L72 61Z" /></g>,
      'power-fist': <circle cx="57" cy="59" r="17" fill={core} stroke={glow} strokeWidth="3" filter={`url(#${uid}-glow)`} />,
      'nebula-glove': <g fill={glow}><circle cx="43" cy="47" r="2" /><circle cx="57" cy="63" r="1.5" /><circle cx="74" cy="49" r="2" /><circle cx="69" cy="75" r="1.5" /></g>,
      'royal-gauntlet': <path d="M42 39L56 49L70 39L66 60L56 68L46 60Z" fill={shine} stroke={glow} />,
      'star-knuckle': <path d="M56 37L61 51L75 51L64 60L68 74L56 66L44 74L48 60L37 51L51 51Z" fill={core} stroke={glow} />,
      'ancient-hand': <g fill="none" stroke={glow} strokeWidth="2"><path d="M38 35L48 49L43 63L54 76M76 35L66 49L71 63L60 76" /></g>,
      'dragon-gauntlet': <path d="M40 59L49 47L56 59L63 47L70 59L77 47L86 59L76 75L60 84L44 75Z" fill={tone.accent} stroke={glow} />,
      'flame-fist': <path d="M47 68C42 55 53 51 55 39C65 51 72 57 66 70C61 64 54 64 47 68Z" fill={shine} stroke={glow} />,
      'storm-grip': <path d="M63 35L48 58H59L54 80L73 51H62Z" fill={shine} stroke={glow} />,
      'constellation-bracer': <g fill={glow}><circle cx="44" cy="46" r="2" /><circle cx="57" cy="59" r="2" /><circle cx="73" cy="46" r="2" /><path d="M44 46L57 59L73 46" fill="none" stroke={glow} strokeWidth="1.5" /></g>,
      'sky-gauntlet': <path d="M36 53L15 38L29 61M80 53L101 38L87 61" fill="none" stroke={glow} strokeWidth="4" />,
    }[design];
    return <g strokeLinecap="round" strokeLinejoin="round">{detail}</g>;
  }

  if (item.slot === 'shoes') {
    const detail = {
      sandal: <path d="M28 49L48 66M75 48L92 65" stroke={glow} strokeWidth="5" />,
      boot: <path d="M31 34H48M68 34H85" stroke={glow} strokeWidth="4" />,
      runner: <path d="M24 76Q42 66 56 76M64 76Q78 66 96 76" fill="none" stroke={glow} strokeWidth="4" />,
      greave: <path d="M34 26L47 33L45 60M68 33L86 25L88 60" fill="none" stroke={glow} strokeWidth="4" />,
      walker: <path d="M29 59L49 59M69 59L90 59M27 70L49 70M71 70L93 70" stroke={glow} strokeWidth="2" />,
      step: <path d="M28 53L47 61L39 72L24 65M92 53L73 61L81 72L96 65" fill={core} stroke={glow} />,
      'crest-boot': <path d="M60 22L68 38L60 50L52 38Z" fill={shine} stroke={glow} />,
      'star-strider': <path d="M60 28L65 42L79 42L68 51L72 65L60 57L48 65L52 51L41 42L55 42Z" fill={core} stroke={glow} />,
      'rune-walker': <g fill="none" stroke={glow} strokeWidth="2"><circle cx="39" cy="61" r="10" /><circle cx="81" cy="61" r="10" /><path d="M39 51V71M29 61H49M81 51V71M71 61H91" /></g>,
      'crystal-greave': <g fill={shine} stroke={glow}><path d="M35 39L44 26L51 43L42 55Z" /><path d="M69 43L76 26L85 39L78 55Z" /></g>,
      'knight-boot': <path d="M31 40L43 32L53 43L47 57M89 40L77 32L67 43L73 57" fill={tone.dark} stroke={glow} />,
      'nebula-step': <g fill={glow}><circle cx="37" cy="50" r="2" /><circle cx="50" cy="67" r="1.5" /><circle cx="77" cy="50" r="2" /><circle cx="89" cy="67" r="1.5" /></g>,
      'royal-greave': <path d="M38 31H55L50 46H34ZM65 31H82L86 46H70Z" fill={shine} stroke={glow} />,
      'sun-runner': <circle cx="60" cy="58" r="15" fill={core} stroke={glow} filter={`url(#${uid}-glow)`} />,
      'ancient-boot': <g fill="none" stroke={glow} strokeWidth="2"><path d="M31 31L43 43L37 56L49 68M89 31L77 43L83 56L71 68" /></g>,
      'dragon-claw': <path d="M34 58L25 84M49 59L45 90M71 59L75 90M86 58L95 84" stroke={glow} strokeWidth="4" />,
      'flame-walker': <path d="M47 70C42 56 54 52 56 39C67 51 74 58 67 73C62 66 55 66 47 70Z" fill={shine} stroke={glow} />,
      'storm-step': <path d="M63 33L48 56H59L54 78L73 48H62Z" fill={shine} stroke={glow} />,
      'constellation-boot': <g fill={glow}><circle cx="35" cy="43" r="2" /><circle cx="60" cy="54" r="2" /><circle cx="85" cy="43" r="2" /><path d="M35 43L60 54L85 43" fill="none" stroke={glow} strokeWidth="1.5" /></g>,
      'sky-greave': <path d="M35 45L13 30L29 57M85 45L107 30L91 57" fill="none" stroke={glow} strokeWidth="4" />,
    }[design];
    return <g strokeLinecap="round" strokeLinejoin="round">{detail}</g>;
  }

  if (item.slot === 'accessory') {
    const detail = {
      charm: <path d="M60 30L68 43L60 53L52 43Z" fill={shine} stroke={glow} />,
      chip: <rect x="39" y="38" width="42" height="30" rx="5" fill={tone.dark} stroke={glow} />,
      core: <circle cx="60" cy="58" r="18" fill={core} stroke={glow} filter={`url(#${uid}-glow)`} />,
      ring: <ellipse cx="60" cy="58" rx="30" ry="16" fill="none" stroke={glow} strokeWidth="3" />,
      sigil: <g fill="none" stroke={glow} strokeWidth="2"><circle cx="60" cy="58" r="14" /><path d="M60 40V76M42 58H78M47 45L73 71M73 45L47 71" /></g>,
      pendant: <path d="M60 18L80 48L60 94L40 48Z" fill={shine} stroke={glow} />,
      medal: <><circle cx="60" cy="58" r="22" fill={core} stroke={glow} /><path d="M50 33L60 23L70 33" fill="none" stroke={glow} strokeWidth="5" /></>,
      brooch: <path d="M60 29L67 48L87 48L71 60L77 80L60 68L43 80L49 60L33 48L53 48Z" fill={core} stroke={glow} />,
      crystal: <g fill={shine} stroke={glow}><path d="M60 20L76 46L60 81L44 46Z" /><path d="M60 20V81M44 46H76" stroke="#fff" strokeWidth="2" /></g>,
      heart: <path d="M60 83L36 58C23 43 42 28 55 42L60 48L65 42C78 28 97 43 84 58Z" fill={shine} stroke={glow} />,
      emblem: <path d="M60 22L68 39L87 41L73 54L77 73L60 64L43 73L47 54L33 41L52 39Z" fill={core} stroke={glow} />,
      nebula: <g fill={glow}><circle cx="42" cy="42" r="2" /><circle cx="74" cy="45" r="2" /><circle cx="52" cy="76" r="2" /><circle cx="78" cy="72" r="1.5" /></g>,
      seal: <path d="M42 35H78L84 58L60 86L36 58Z" fill={tone.dark} stroke={glow} />,
      'sun-medal': <><circle cx="60" cy="58" r="16" fill={core} stroke={glow} /><path d="M60 27V38M60 78V89M29 58H40M80 58H91M39 37L47 45M73 71L81 79M81 37L73 45M47 71L39 79" stroke={glow} strokeWidth="3" /></>,
      'rune-core': <g fill="none" stroke={glow} strokeWidth="2"><circle cx="60" cy="58" r="20" /><path d="M60 38V78M40 58H80M47 45L73 71M73 45L47 71" /></g>,
      'dragon-gem': <path d="M60 20L73 37L90 43L76 58L79 80L60 69L41 80L44 58L30 43L47 37Z" fill={shine} stroke={glow} />,
      'flame-ring': <><path d="M60 31C51 43 48 51 60 66C72 51 69 43 60 31Z" fill={shine} stroke={glow} /><ellipse cx="60" cy="67" rx="22" ry="10" fill="none" stroke={glow} strokeWidth="4" /></>,
      'storm-sigil': <path d="M63 28L46 56H59L54 82L76 48H63Z" fill={shine} stroke={glow} />,
      constellation: <g fill={glow}><circle cx="42" cy="38" r="2" /><circle cx="73" cy="39" r="2" /><circle cx="82" cy="67" r="2" /><circle cx="50" cy="78" r="2" /><path d="M42 38L73 39L82 67L50 78L42 38" fill="none" stroke={glow} strokeWidth="1.5" /></g>,
      'crown-gem': <path d="M32 47L45 68L60 34L75 68L88 47L80 83H40Z" fill={shine} stroke={glow} />,
    }[design];
    return <g strokeLinecap="round" strokeLinejoin="round">{detail}</g>;
  }

  return null;
}

function ItemArtwork({ item }) {
  const tone = toneOf(item);
  const tier = Math.min(5, Math.max(1, Number(item.level) ? Math.ceil(item.level / 4) : 1));
  const uid = `hero-art-${idPart(item.id)}`;
  return (
    <svg className="hero-item-art" viewBox="0 0 120 120" role="img" aria-label={item.name}>
      <ArtDefs uid={uid} tone={tone} />
      {item.slot === 'helmet' && <HelmetArt item={item} tone={tone} uid={uid} tier={tier} />}
      {item.slot === 'weapon' && <WeaponArt item={item} tone={tone} uid={uid} tier={tier} />}
      {item.slot === 'armor' && <ArmorArt item={item} tone={tone} uid={uid} tier={tier} />}
      {item.slot === 'gloves' && <GlovesArt item={item} tone={tone} uid={uid} tier={tier} />}
      {item.slot === 'shoes' && <ShoesArt item={item} tone={tone} uid={uid} tier={tier} />}
      {item.slot === 'accessory' && <AccessoryArt item={item} tone={tone} uid={uid} tier={tier} />}
      {item.slot === 'pet' && <PetArt item={item} tone={tone} uid={uid} tier={tier} />}
      {item.slot !== 'pet' && <DesignSignature item={item} tone={tone} uid={uid} />}
    </svg>
  );
}

export function HeroEquipmentOverlay({ item, className = '' }) {
  if (!item) return null;
  return (
    <span className={`hero-equipment-overlay ${className}`} aria-label={`${item.name} 장착`}>
      <ItemArtwork item={item} />
    </span>
  );
}

export function HeroPetVisual({ item, size = 56, className = '' }) {
  if (!item) return null;
  return (
    <span className={`hero-pet-art ${className}`} style={{ width: size, height: size }} aria-label={item.name}>
      <ItemArtwork item={item} />
    </span>
  );
}

function CharacterArtwork({ item }) {
  const art = item.visual?.art;
  if (!art) return <span className="hero-item-character-fallback">✦</span>;
  return <HeroCharacterArt className="hero-item-character-art" src={art} alt="" />;
}

export function HeroItemVisual({ item, size = 76, className = '', showLevel = true }) {
  if (!item) {
    return (
      <div className={`hero-item-card-v2 hero-item-empty ${className}`} style={{ width: size, height: size }}>
        <span>EMPTY</span>
      </div>
    );
  }

  const gradeKey = item.rarity && HERO_GRADE_VISUALS[item.rarity] ? item.rarity : 'common';
  const grade = HERO_GRADE_VISUALS[gradeKey];
  const theme = item.rarity ? HERO_RARITIES[item.rarity] : null;
  const tone = toneOf(item);
  const transcendent = item.rarity === 'transcendent';
  const style = {
    width: size,
    height: size,
    '--item-main': tone.main,
    '--item-accent': tone.accent,
    '--item-glow': tone.glow,
    '--item-dark': tone.dark,
    '--item-rarity': theme?.accent || tone.accent,
    '--item-grade-main': grade.main,
    '--item-grade-accent': grade.accent,
    '--item-grade-glow': grade.glow,
    '--item-grade-dark': grade.dark,
  };
  return (
    <div
      className={`hero-item-card-v2 hero-item-grade-${gradeKey} hero-item-shape-${grade.shape} ${transcendent ? 'hero-item-card-prismatic' : ''} ${item.rarity === 'legendary' ? 'hero-item-card-legendary' : ''} ${item.rarity === 'elite' ? 'hero-item-card-elite' : ''} ${className}`}
      style={style}
      title={item.name}
      aria-label={item.name}
    >
      <div className="hero-item-card-grid" />
      <div className="hero-item-card-corner hero-item-card-corner-left" />
      <div className="hero-item-card-corner hero-item-card-corner-right" />
      <div className={`hero-item-grade-frame hero-item-grade-frame-${grade.shape}`} aria-hidden="true">
        <span className="hero-item-grade-symbol">{grade.symbol}</span>
      </div>
      <div className="hero-item-card-topline">
        <span className="hero-item-card-grade-label">{grade.label}</span>
        <b>{item.slot === 'character' ? '01' : String(item.level).padStart(2, '0')}</b>
      </div>
      <div className={`hero-item-card-glyph hero-item-card-glyph-${item.visual?.design || item.slot}`}>
        {item.slot === 'character' ? <CharacterArtwork item={item} /> : <ItemArtwork item={item} />}
      </div>
      <div className="hero-item-card-bottomline">
        <span>{SLOT_LABELS[item.slot] || '아이템'}</span>
        {showLevel && <b>{item.rarityLabel || grade.korean}</b>}
      </div>
      {item.slot === 'pet' && <span className="hero-item-card-pet-rate">{item.critChance}%</span>}
    </div>
  );
}

export function HeroRarityBadge({ item }) {
  if (!item?.rarity) return null;
  const rarity = HERO_RARITIES[item.rarity];
  return <span className={`hero-rarity-badge-v2 hero-rarity-${item.rarity}`}>{rarity.label}</span>;
}
