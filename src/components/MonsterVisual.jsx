const MARKS = ['✦', '◆', '☄', '✚', '☾', '✧', '❖', '⚡', '✿', '◇'];

export default function MonsterVisual({ monster, size = 132 }) {
  const visual = monster?.visual || {};
  const style = {
    '--monster-body': visual.body || '#fb7185',
    '--monster-accent': visual.accent || '#881337',
    '--monster-radius': visual.radius || '50%',
    width: size,
    height: size,
  };
  return (
    <div
      className={['monster-visual', 'monster-kind-' + (visual.kind || 'slime'), monster?.boss ? 'monster-boss' : ''].join(' ')}
      style={style}
      aria-label={monster?.name}
    >
      <div className="monster-aura" />
      <div className="monster-wing monster-wing-left" />
      <div className="monster-wing monster-wing-right" />
      <div className="monster-horn monster-horn-left" />
      <div className="monster-horn monster-horn-right" />
      <div className="monster-body">
        <div className="monster-pattern" style={{ transform: 'rotate(' + ((visual.variant || 0) * 13) + 'deg)' }} />
        <div className="monster-face">
          <span className="monster-eye monster-eye-left" />
          <span className="monster-eye monster-eye-right" />
          <span className="monster-mouth" />
        </div>
        <span className="monster-mark">{MARKS[visual.mark || 0]}</span>
      </div>
      <span className="monster-glyph">{visual.emoji || monster?.emoji || '👾'}</span>
      {monster?.boss && <span className="monster-crown">♛</span>}
    </div>
  );
}
