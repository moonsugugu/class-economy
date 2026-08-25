const MARKS = ['✦', '◆', '☄', '✚', '☾', '✧', '❖', '⚡', '✿', '◇'];

function Face({ tone, variant = 0 }) {
  const sleepy = variant === 3;
  return (
    <g>
      <ellipse cx="45" cy="60" rx="5" ry="7" fill={tone.dark} />
      <ellipse cx="75" cy="60" rx="5" ry="7" fill={tone.dark} />
      {sleepy && <path d="M39 60L50 60M70 60L81 60" stroke={tone.glow} strokeWidth="3" strokeLinecap="round" />}
      <path d={variant === 1 ? 'M50 77L60 70L70 77' : 'M51 74Q60 82 69 74'} fill="none" stroke={tone.glow} strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="67" r="3" fill={tone.glow} />
    </g>
  );
}

function VariantDecor({ variant, tone }) {
  if (variant === 1) {
    return <path d="M18 34L29 25L40 34M80 34L91 25L102 34M18 86L29 95L40 86M80 86L91 95L102 86" fill="none" stroke={tone.glow} strokeWidth="2.5" />;
  }
  if (variant === 2) {
    return <g fill={tone.glow} stroke={tone.accent} strokeWidth="2"><path d="M42 25L48 8L55 26Z" /><path d="M58 22L66 4L72 24Z" /><path d="M76 27L87 10L88 34Z" /></g>;
  }
  if (variant === 3) {
    return <g fill="none" stroke={tone.glow} strokeWidth="1.8" strokeDasharray="2 5"><ellipse cx="60" cy="60" rx="50" ry="28" transform="rotate(-28 60 60)" /><ellipse cx="60" cy="60" rx="50" ry="28" transform="rotate(28 60 60)" /></g>;
  }
  if (variant === 4) {
    return <g fill={tone.accent} stroke={tone.glow} strokeWidth="2"><path d="M25 42L11 25L32 32Z" /><path d="M95 42L109 25L88 32Z" /><path d="M33 89L18 103L38 96Z" /><path d="M87 89L102 103L82 96Z" /></g>;
  }
  return <g fill={tone.glow} opacity=".9"><circle cx="18" cy="58" r="3" /><circle cx="102" cy="58" r="3" /><circle cx="60" cy="14" r="3" /></g>;
}

function MonsterArt({ monster, tone }) {
  const visual = monster?.visual || {};
  const kind = visual.kind || 'slime';
  const variant = Number(visual.variant) || 0;
  const id = `monster-${String(visual.key || monster?.level || kind).replace(/[^a-z0-9-]/gi, '')}`;
  const metal = `url(#${id}-body)`;
  const core = `url(#${id}-core)`;
  let shape;
  if (kind === 'slime') shape = <path d="M22 81C18 47 35 25 60 25S102 47 98 81C90 102 30 102 22 81Z" fill={metal} />;
  else if (kind === 'bat') shape = <><path d="M60 34C46 27 28 29 14 46L35 51L17 69L43 66L60 91L77 66L103 69L85 51L106 46C92 29 74 27 60 34Z" fill={metal} /><path d="M60 38V86" stroke={tone.glow} strokeWidth="2" /></>;
  else if (kind === 'goblin') shape = <><path d="M34 47L17 22L43 31C53 26 67 26 77 31L103 22L86 47L80 84C68 99 52 99 40 84Z" fill={metal} /><path d="M48 75L54 87L60 76L66 87L72 75" fill={tone.accent} /></>;
  else if (kind === 'boar') shape = <><path d="M24 77C15 52 32 31 60 31S105 52 96 77C87 97 33 97 24 77Z" fill={metal} /><path d="M39 67C45 56 75 56 81 67L76 86H44Z" fill={tone.accent} /><path d="M43 79L31 91M77 79L89 91" stroke={tone.glow} strokeWidth="6" strokeLinecap="round" /></>;
  else if (kind === 'spider') shape = <><ellipse cx="60" cy="59" rx="25" ry="28" fill={metal} /><ellipse cx="60" cy="84" rx="19" ry="17" fill={tone.accent} /><path d="M43 48L13 29M40 60L8 60M43 71L13 91M77 48L107 29M80 60L112 60M77 71L107 91" stroke={tone.accent} strokeWidth="6" strokeLinecap="round" /></>;
  else if (kind === 'imp') shape = <><path d="M30 79C25 53 35 33 60 28C85 33 95 53 90 79C80 98 40 98 30 79Z" fill={metal} /><path d="M42 35L28 13L50 27M78 35L92 13L70 27" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M29 57L8 44L28 72M91 57L112 44L92 72" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /></>;
  else if (kind === 'orc') shape = <><path d="M23 81C16 47 32 23 60 23S104 47 97 81C84 103 36 103 23 81Z" fill={metal} /><path d="M31 38L12 22L33 55M89 38L108 22L87 55" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M44 75L52 91L60 78L68 91L76 75" fill={tone.glow} /></>;
  else if (kind === 'swamp') shape = <><path d="M15 72C26 42 43 31 64 37L105 50L87 70L105 86L64 91C42 97 24 90 15 72Z" fill={metal} /><path d="M79 48L106 38L98 59" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M29 72L13 86M47 81L35 101" stroke={tone.accent} strokeWidth="7" strokeLinecap="round" /></>;
  else if (kind === 'wolf') shape = <><path d="M28 49L25 16L48 32C56 28 64 28 72 32L95 16L92 49L84 84C73 99 47 99 36 84Z" fill={metal} /><path d="M31 47L15 31L25 61M89 47L105 31L95 61" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M48 76L60 86L72 76" fill={tone.dark} stroke={tone.glow} strokeWidth="2" /></>;
  else if (kind === 'bull') shape = <><path d="M28 79C22 48 35 28 60 28S98 48 92 79C83 99 37 99 28 79Z" fill={metal} /><path d="M35 39L10 21L22 54M85 39L110 21L98 54" fill={tone.accent} stroke={tone.glow} strokeWidth="4" /><path d="M47 77L54 87L60 78L66 87L73 77" fill={tone.glow} /></>;
  else if (kind === 'plant') shape = <><path d="M60 92C50 78 45 62 60 45C75 62 70 78 60 92Z" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M60 55C34 48 20 31 29 17C45 20 56 31 60 47C64 31 75 20 91 17C100 31 86 48 60 55Z" fill={metal} stroke={tone.accent} strokeWidth="3" /><circle cx="60" cy="40" r="12" fill={core} stroke={tone.glow} strokeWidth="2" /></>;
  else if (kind === 'mushroom') shape = <><path d="M18 56C21 23 99 23 102 56C82 65 38 65 18 56Z" fill={metal} /><path d="M48 54H72V94C68 102 52 102 48 94Z" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><circle cx="40" cy="42" r="6" fill={tone.glow} /><circle cx="60" cy="33" r="7" fill={tone.glow} /><circle cx="80" cy="43" r="5" fill={tone.glow} /></>;
  else if (kind === 'crab') shape = <><ellipse cx="60" cy="64" rx="34" ry="27" fill={metal} /><path d="M28 55L8 38L13 69L31 66M92 55L112 38L107 69L89 66" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M35 81L21 97M46 86L37 105M85 81L99 97M74 86L83 105" stroke={tone.accent} strokeWidth="5" strokeLinecap="round" /></>;
  else if (kind === 'jellyfish') shape = <><path d="M20 57C20 28 100 28 100 57C91 75 29 75 20 57Z" fill={metal} /><path d="M31 69L27 102M46 70L45 108M60 72V104M74 70L76 108M89 69L94 102" stroke={tone.accent} strokeWidth="6" strokeLinecap="round" /><circle cx="43" cy="49" r="6" fill={tone.glow} /><circle cx="78" cy="49" r="6" fill={tone.glow} /></>;
  else if (kind === 'dragon') shape = <><path d="M29 70L26 22L49 36C56 31 64 31 71 36L94 22L91 70C83 94 37 94 29 70Z" fill={metal} /><path d="M31 51L7 31L26 67M89 51L113 31L94 67" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M45 26L60 7L75 26" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /></>;
  else if (kind === 'sphinx') shape = <><path d="M30 78L29 36L44 22L60 33L76 22L91 36L90 78C78 96 42 96 30 78Z" fill={metal} /><path d="M44 22L33 8L50 18M76 22L87 8L70 18" fill={tone.accent} stroke={tone.glow} strokeWidth="3" /><path d="M43 82H77" stroke={tone.glow} strokeWidth="4" /></>;
  else if (kind === 'robot') shape = <><rect x="25" y="25" width="70" height="65" rx="12" fill={metal} /><rect x="38" y="44" width="44" height="26" rx="7" fill={tone.dark} stroke={tone.glow} strokeWidth="3" /><circle cx="49" cy="57" r="5" fill={tone.glow} /><circle cx="71" cy="57" r="5" fill={tone.glow} /><path d="M60 25V10M53 10H67" stroke={tone.accent} strokeWidth="5" strokeLinecap="round" /><path d="M25 45H12M95 45H108M40 91V105M80 91V105" stroke={tone.accent} strokeWidth="6" strokeLinecap="round" /></>;
  else if (kind === 'ghost') shape = <><path d="M22 82C22 30 98 25 98 82L88 73L76 88L60 75L44 88L32 73Z" fill={metal} /><path d="M42 58V66M78 58V66" stroke={tone.glow} strokeWidth="7" strokeLinecap="round" /><path d="M52 75Q60 82 68 75" fill="none" stroke={tone.glow} strokeWidth="3" /></>;
  else if (kind === 'kraken') shape = <><ellipse cx="60" cy="48" rx="27" ry="24" fill={metal} /><path d="M39 63C21 73 24 92 10 100M49 66C38 83 50 96 38 110M60 68V110M71 66C82 83 70 96 82 110M81 63C99 73 96 92 110 100" fill="none" stroke={tone.accent} strokeWidth="8" strokeLinecap="round" /><circle cx="46" cy="45" r="5" fill={tone.glow} /><circle cx="74" cy="45" r="5" fill={tone.glow} /></>;
  else shape = <><path d="M60 93C43 76 27 64 29 43L48 51L60 24L72 51L91 43C93 64 77 76 60 93Z" fill={metal} /><path d="M42 62L13 43L34 79M78 62L107 43L86 79M60 47L60 102" stroke={tone.accent} strokeWidth="7" strokeLinecap="round" /><path d="M60 11L66 27L60 37L54 27Z" fill={tone.glow} /></>;
  return (
    <svg className={`monster-art monster-art-${kind}`} viewBox="0 0 120 120" role="img" aria-label={monster?.name}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tone.glow} />
          <stop offset=".28" stopColor={tone.body} />
          <stop offset="1" stopColor={tone.accent} />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="35%" cy="25%">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".4" stopColor={tone.glow} />
          <stop offset="1" stopColor={tone.body} />
        </radialGradient>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g stroke={tone.accent} strokeWidth="2.5" strokeLinejoin="round">
        {shape}
        <VariantDecor variant={variant} tone={tone} />
        {!['plant', 'mushroom', 'jellyfish', 'robot', 'ghost', 'kraken', 'phoenix'].includes(kind) && <Face tone={tone} variant={variant} />}
        {monster?.boss && <path d="M35 25L42 8L60 20L78 8L85 25L77 31H43Z" fill={core} stroke={tone.glow} strokeWidth="2" filter={`url(#${id}-glow)`} />}
        <circle cx="60" cy="60" r="49" fill="none" stroke={tone.glow} strokeWidth="1.5" strokeDasharray={monster?.boss ? '2 4' : '1 8'} opacity=".58" />
      </g>
      {monster?.boss && <text x="60" y="113" textAnchor="middle" fill={tone.glow} fontSize="8" fontWeight="900" letterSpacing="2">BOSS</text>}
      {!monster?.boss && <text x="103" y="111" textAnchor="end" fill={tone.glow} fontSize="12" fontWeight="900">{MARKS[Number(visual.mark) || 0]}</text>}
    </svg>
  );
}

export default function MonsterVisual({ monster, size = 132 }) {
  const visual = monster?.visual || {};
  const tone = {
    body: visual.body || '#fb7185',
    accent: visual.accent || '#881337',
    glow: visual.glow || '#fecdd3',
    dark: visual.dark || '#2b1026',
  };
  const style = {
    '--monster-body': tone.body,
    '--monster-accent': tone.accent,
    '--monster-glow': tone.glow,
    width: size,
    height: size,
  };
  return (
    <div className={['monster-visual', 'monster-kind-' + (visual.kind || 'slime'), monster?.boss ? 'monster-boss' : ''].join(' ')} style={style} aria-label={monster?.name}>
      <div className="monster-aura" />
      <MonsterArt monster={monster} tone={tone} />
    </div>
  );
}
