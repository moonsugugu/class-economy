const FALLBACK_VISUAL = {
  shape: 'orb',
  body: '#fb7185',
  accent: '#7f1d1d',
  glow: '#fecdd3',
  dark: '#2b1026',
  sigil: 'core',
  mark: '✦',
};

const toneOf = (boss) => ({ ...FALLBACK_VISUAL, ...(boss?.visual || {}) });

export default function BossRaidVisual({ boss, size = 220, defeated = false, className = '' }) {
  const tone = toneOf(boss);
  const style = {
    width: size,
    height: size,
    '--raid-boss-body': tone.body,
    '--raid-boss-accent': tone.accent,
    '--raid-boss-glow': tone.glow,
    '--raid-boss-dark': tone.dark,
  };
  return (
    <div
      className={`boss-raid-visual boss-raid-shape-${tone.shape} ${defeated ? 'boss-raid-defeated' : ''} ${className}`}
      style={style}
      aria-label={boss?.name || '보스'}
    >
      <div className="boss-raid-stars" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--raid-star-index': index }} />)}
      </div>
      <div className="boss-raid-aura" />
      <div className="boss-raid-wing boss-raid-wing-left" />
      <div className="boss-raid-wing boss-raid-wing-right" />
      <div className="boss-raid-horn boss-raid-horn-left" />
      <div className="boss-raid-horn boss-raid-horn-right" />
      <div className="boss-raid-body">
        <div className="boss-raid-pattern" />
        <div className="boss-raid-face">
          <span className="boss-raid-eye boss-raid-eye-left" />
          <span className="boss-raid-eye boss-raid-eye-right" />
          <span className="boss-raid-mouth" />
        </div>
        <span className="boss-raid-core">{tone.mark}</span>
      </div>
      <div className="boss-raid-sigil">{tone.sigil}</div>
      <div className="boss-raid-level">LV.{String(boss?.level || 1).padStart(2, '0')}</div>
      <div className="boss-raid-label">{defeated ? 'DEFEATED' : 'CLASS RAID'}</div>
    </div>
  );
}

