import {
  HERO_GRADE_VISUALS, HERO_ITEM_MAP, HERO_PET_SLOT, HERO_SLOTS,
  bossCriticalChance, criticalDamageBonus, formatHeroSpecialStats,
  heroEnhancementFor, heroEnhancementStats, heroItemPower,
} from '../lib/hero';
import { HeroItemVisual } from './HeroItemVisual.jsx';

// 부위별 장착 장비(6칸)와 펫을 "그 칸에 장착한 아이템의 등급" 배지와 함께 보여줍니다.
// onSelect를 넘기면 칸을 눌러 강화 창을 열 수 있고, 없으면 읽기 전용(선생님 화면)입니다.
const SHORT_STAT = [['보스전 크리티컬 확률', '치명타 확률'], ['크리티컬 데미지', '치명타 피해']];
const shortStat = (stat) => SHORT_STAT.reduce((text, [from, to]) => text.replace(from, to), stat);

function slotChips(hero, item, isPet) {
  const chips = [
    ...(isPet ? [] : formatHeroSpecialStats(item).map((stat) => ({ key: stat, text: shortStat(stat), tone: 'special' }))),
    ...heroEnhancementStats(hero, item.id).map((stat) => ({ key: stat.key, text: `${stat.label} +${stat.value}`, tone: 'enhance' })),
  ];
  if (isPet) {
    const critChance = bossCriticalChance(hero);
    const critDamage = criticalDamageBonus(hero);
    if (critChance > 0) chips.unshift({ key: 'crit', text: `치명타 확률 ${critChance}%`, tone: 'special' });
    chips.push({ key: 'critHit', text: '치명타 시 보스 피해 ×2', tone: 'muted' });
    if (critDamage > 0) chips.push({ key: 'critDamage', text: `치명타 피해 +${critDamage}%`, tone: 'special' });
  }
  return chips;
}

function SlotCard({ hero, slot, label, item, onSelect }) {
  const isPet = slot === 'pet';
  if (!item) {
    return (
      <div className="hero-slot-card hero-slot-card-empty">
        <HeroItemVisual item={null} size={48} showLevel={false} />
        <div className="hero-slot-body">
          <div className="hero-slot-top"><span className="hero-slot-label">{label}</span></div>
          <div className="hero-slot-name">미장착</div>
        </div>
      </div>
    );
  }

  const grade = HERO_GRADE_VISUALS[item.rarity] || HERO_GRADE_VISUALS.common;
  const enhancement = heroEnhancementFor(hero, item.id);
  const chips = slotChips(hero, item, isPet);
  const style = { '--slot-main': grade.main, '--slot-accent': grade.accent, '--slot-glow': grade.glow, '--slot-dark': grade.dark };
  const content = (
    <>
      <HeroItemVisual item={item} size={52} showLevel={false} />
      <div className="hero-slot-body">
        <div className="hero-slot-top">
          <span className="hero-slot-label">{label}</span>
          <span className="hero-slot-grade">{grade.symbol} {grade.korean}</span>
        </div>
        <div className="hero-slot-name" title={item.name}>{item.name}</div>
        <div className="hero-slot-meta">
          {item.level}단계 {isPet ? '펫' : '장비'}
          {enhancement.level > 0 && <b> · +{enhancement.level}강</b>}
        </div>
        {chips.length > 0 && (
          <div className="hero-slot-chips">
            {chips.map((chip) => <span key={chip.key} className={`hero-slot-chip hero-slot-chip-${chip.tone}`}>{chip.text}</span>)}
          </div>
        )}
      </div>
      <div className="hero-slot-power">
        <b>+{heroItemPower(item, enhancement)}</b>
        <small>전투력</small>
      </div>
    </>
  );

  if (!onSelect) {
    return <div className={`hero-slot-card hero-slot-grade-${item.rarity}`} style={style}>{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`hero-slot-card hero-slot-card-button hero-slot-grade-${item.rarity}`}
      style={style}
      aria-label={`${label} ${item.name} 강화 창 열기`}
    >
      {content}
    </button>
  );
}

export default function HeroLoadoutList({ hero, onSelect, layout = 'list' }) {
  // 카드 그림(HeroCardVisual)과 같은 규칙: 칸의 부위와 아이템 부위가 같을 때만 장착으로 봅니다.
  const itemFor = (slot) => {
    const item = HERO_ITEM_MAP[slot === 'pet' ? hero.pet : hero.equipment?.[slot]];
    return item?.slot === slot ? item : null;
  };
  const slots = [...HERO_SLOTS, HERO_PET_SLOT].map(([slot, label]) => ({ slot, label, item: itemFor(slot) }));

  return (
    <div className={`hero-slot-list hero-slot-list-${layout}`}>
      {slots.map(({ slot, label, item }) => (
        <SlotCard key={slot} hero={hero} slot={slot} label={label} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}
