const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const BOSS_RAID_MAX_LEVEL = 100;
export const BOSS_RAID_DEFAULT_REWARD_POOL = 500;

const BOSS_TITLES = ['잿빛', '청람', '홍련', '성운', '황혼'];
const BOSS_SIGILS = ['✦', '◇', '◈', '✧', '◆', '☄', 'ϟ', '✺', '✚', '⌬'];
const BOSS_PALETTES = [
  { body: '#fb7185', accent: '#7f1d1d', glow: '#fecdd3', dark: '#2b1026' },
  { body: '#60a5fa', accent: '#1e3a8a', glow: '#bae6fd', dark: '#101d48' },
  { body: '#a78bfa', accent: '#4c1d95', glow: '#ddd6fe', dark: '#21123f' },
  { body: '#2dd4bf', accent: '#115e59', glow: '#99f6e4', dark: '#092e38' },
  { body: '#fbbf24', accent: '#92400e', glow: '#fef3c7', dark: '#3c2110' },
  { body: '#f472b6', accent: '#831843', glow: '#fbcfe8', dark: '#3b1439' },
  { body: '#c084fc', accent: '#581c87', glow: '#f3e8ff', dark: '#24103c' },
  { body: '#34d399', accent: '#065f46', glow: '#a7f3d0', dark: '#0b302c' },
  { body: '#fb923c', accent: '#7c2d12', glow: '#fed7aa', dark: '#3d1b12' },
  { body: '#22d3ee', accent: '#164e63', glow: '#cffafe', dark: '#092d43' },
];

const BOSS_ARCHETYPES = [
  ['오로라 코어', 'orb', 'core'],
  ['코발트 기사', 'knight', 'shield'],
  ['심해 레비아탄', 'leviathan', 'wave'],
  ['블룸 퀸', 'bloom', 'petal'],
  ['볼트 골렘', 'golem', 'bolt'],
  ['미라지 스핑크스', 'sphinx', 'eye'],
  ['루나 울프', 'wolf', 'moon'],
  ['오닉스 비스트', 'beast', 'fang'],
  ['선라이트 드레이크', 'drake', 'sun'],
  ['보이드 리퍼', 'reaper', 'void'],
  ['프로스트 타이탄', 'titan', 'frost'],
  ['코랄 크라켄', 'kraken', 'coral'],
  ['플라즈마 맨티스', 'mantis', 'plasma'],
  ['루트 키퍼', 'keeper', 'root'],
  ['아이언 콜로서스', 'colossus', 'iron'],
  ['스타 포식자', 'devourer', 'star'],
  ['문 게이트', 'portal', 'moon'],
  ['썬더 버드', 'bird', 'thunder'],
  ['에메랄드 웜', 'wyrm', 'emerald'],
  ['아스트랄 왕', 'king', 'crown'],
];

const BOSS_DESIGNS = BOSS_ARCHETYPES.flatMap(([name, shape, sigil], archetypeIndex) => (
  BOSS_TITLES.map((title, variantIndex) => {
    const designIndex = archetypeIndex * BOSS_TITLES.length + variantIndex;
    const palette = BOSS_PALETTES[designIndex % BOSS_PALETTES.length];
    return {
      designId: `raid-boss-design-${designIndex + 1}`,
      name: `${title} ${name}`,
      shape,
      tier: archetypeIndex + 1,
      variant: variantIndex,
      visual: {
        shape,
        sigil,
        mark: BOSS_SIGILS[designIndex % BOSS_SIGILS.length],
        body: palette.body,
        accent: palette.accent,
        glow: palette.glow,
        dark: palette.dark,
      },
    };
  })
));

function dayOrdinal(dateKey = '') {
  const match = String(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
}

export function normalizeBossRaidLevel(value) {
  return clamp(Math.floor(Number(value) || 1), 1, BOSS_RAID_MAX_LEVEL);
}

export function bossRaidMaxHp(level) {
  const safeLevel = normalizeBossRaidLevel(level);
  return Math.floor(1000 + safeLevel * 180 + Math.pow(safeLevel, 1.25) * 45);
}

export function bossRaidRewardPool(klass = {}, level) {
  const configured = Number(klass.bossRaidRewardPool);
  if (Number.isFinite(configured) && configured > 0) return Math.floor(configured);
  return BOSS_RAID_DEFAULT_REWARD_POOL + (normalizeBossRaidLevel(level) - 1) * 25;
}

/** 새 보스를 생성할 때 단계·날짜로 디자인을 고릅니다. 진행 중인 보스는 호출부에서 학급 문서에 보존해요. */
export function bossRaidFor(level, dateKey = '') {
  const safeLevel = normalizeBossRaidLevel(level);
  const ordinal = dayOrdinal(dateKey);
  const design = BOSS_DESIGNS[(safeLevel - 1 + ordinal) % BOSS_DESIGNS.length];
  const palette = BOSS_PALETTES[(safeLevel * 3 + ordinal) % BOSS_PALETTES.length];
  return {
    level: safeLevel,
    name: design.name,
    designId: design.designId,
    maxHp: bossRaidMaxHp(safeLevel),
    rewardPool: bossRaidRewardPool({}, safeLevel),
    visual: {
      ...design.visual,
      body: palette.body,
      accent: palette.accent,
      glow: palette.glow,
      dark: palette.dark,
      dayVariant: Math.abs(ordinal) % 100,
    },
  };
}

export function raidParticipantTotalDamage(participants = []) {
  return participants.reduce((sum, participant) => sum + Math.max(0, Number(participant.damage) || 0), 0);
}

/** 비례 배분 후 큰 소수점부터 1씩 나눠 보상 합계가 정확히 맞도록 합니다. */
export function allocateBossRaidRewards(participants = [], pool = 0) {
  const eligible = participants
    .filter((participant) => participant?.studentId && (Number(participant.damage) || 0) > 0)
    .map((participant) => ({ ...participant, damage: Math.max(0, Number(participant.damage) || 0) }));
  const totalDamage = raidParticipantTotalDamage(eligible);
  const safePool = Math.max(0, Math.floor(Number(pool) || 0));
  if (!eligible.length || totalDamage <= 0 || safePool <= 0) return [];

  const calculated = eligible
    .map((participant) => {
      const exact = (participant.damage / totalDamage) * safePool;
      return { ...participant, reward: Math.floor(exact), remainder: exact - Math.floor(exact) };
    })
    .sort((a, b) => b.remainder - a.remainder || b.damage - a.damage || String(a.studentId).localeCompare(String(b.studentId)));
  let remaining = safePool - calculated.reduce((sum, participant) => sum + participant.reward, 0);
  for (let index = 0; remaining > 0; index += 1, remaining -= 1) {
    calculated[index % calculated.length].reward += 1;
  }
  return calculated
    .sort((a, b) => b.damage - a.damage || String(a.studentName || '').localeCompare(String(b.studentName || ''), 'ko'))
    .map(({ remainder, ...participant }, index) => ({ ...participant, rank: index + 1 }));
}
