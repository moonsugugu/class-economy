const FOOD_STOCKS = ['KO', 'MCD', 'PEP', 'WMT', 'COST', 'KTNG', 'KIA'];
const TECH_STOCKS = ['SAMSUNG', 'SKHYNIX', 'NAVER', 'KAKAO', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AVGO', 'AMD', 'INTC'];
const DEFENSE_STOCKS = ['HANWHA', 'HDHYNDAI', 'DOOSAN'];
const CONSUMER_STOCKS = ['KO', 'MCD', 'PEP', 'WMT', 'COST', 'AMZN', 'DIS', 'KTNG', 'KIA'];

const event = (id, category, title, description, effects = {}) => ({
  id,
  category,
  title,
  description,
  effects,
});

export const ECONOMY_EVENTS = [
  event('infectionSupport', '지원금', '감염병 긴급지원금', '모든 학생에게 100을 지급합니다.', { cashDelta: 100 }),
  event('recoverySupport', '지원금', '경제 회복 지원금', '모든 학생에게 50을 지급합니다.', { cashDelta: 50 }),
  event('localFestival', '지원금', '지역 축제 개최', '모든 학생에게 30을 지급하고 상점 활기를 높입니다.', { cashDelta: 30, priceMultiplier: 1.05 }),
  event('drought', '농업·물가', '가뭄 발생', '식품 관련 주식이 하락하고 물품 가격이 10% 오릅니다.', { priceMultiplier: 1.1, targetStockChangePct: -10, stockSymbols: FOOD_STOCKS }),
  event('bumperHarvest', '농업·물가', '풍년이 들다', '식품 관련 주식이 상승하고 물품 가격이 10% 내립니다.', { priceMultiplier: 0.9, targetStockChangePct: 10, stockSymbols: FOOD_STOCKS }),
  event('warCrisis', '주식시장', '전쟁 위기 고조', '방위산업 주식은 오르고 전체 주식시장은 하락합니다.', { stockChangePct: -5, targetStockChangePct: 15, stockSymbols: DEFENSE_STOCKS }),
  event('peaceTreaty', '주식시장', '평화 협정 체결', '전체 주식시장이 10% 상승합니다.', { stockChangePct: 10 }),
  event('creditUpgrade', '은행·금리', '국가 신용도 상승', '예금 보유 학생에게 20을 지급합니다.', { depositHolderDelta: 20 }),
  event('fiscalCrisis', '세금·물가', '국가 재정 악화', '모든 학생에게 특별세 30을 부과합니다.', { cashDelta: -30 }),
  event('newPolicy', '정책', '새로운 경제정책 발표', '다음에 발동하는 이벤트의 효과를 2배로 적용합니다.', { nextMultiplier: 2 }),

  event('rateHike', '은행·금리', '기준금리 인상', '예금 이자율을 2%p 올립니다.', { depositRateDelta: 2 }),
  event('rateCut', '은행·금리', '기준금리 인하', '예금 이자율을 1%p 내립니다.', { depositRateDelta: -1 }),
  event('preferentialRate', '은행·금리', '은행 특별 우대금리', '예금 이자를 2배로 지급합니다.', { depositInterestMultiplier: 2 }),
  event('youthSavings', '은행·금리', '청소년 저축 장려 기간', '새로 가입하는 적금에 30 보너스를 지급합니다.', { savingsSignupBonus: 30 }),
  event('bankLiquidity', '은행·금리', '은행 유동성 위기', '예금 인출 때 수수료 10을 부과합니다.', { withdrawalFee: 10 }),
  event('bankMaintenance', '은행·금리', '은행 시스템 점검', '이번 이벤트 기간에는 예금 이자를 지급하지 않습니다.', { depositRateMultiplier: 0 }),
  event('loanActivation', '은행·금리', '대출 활성화 정책', '대출 이자율을 2%p 낮추고 한도를 1.5배로 늘립니다.', { loanRateDelta: -2, loanLimitMultiplier: 1.5 }),
  event('loanRestriction', '은행·금리', '대출 규제 강화', '신규 대출 한도가 절반으로 줄어듭니다.', { loanLimitMultiplier: 0.5 }),

  event('stockBoom', '주식시장', '주식시장 호황', '모든 주식 가격이 10% 상승합니다.', { stockChangePct: 10 }),
  event('stockCrash', '주식시장', '주식시장 폭락', '모든 주식 가격이 10% 하락합니다.', { stockChangePct: -10 }),
  event('techAdvance', '주식시장', '기술 발전', 'IT·로봇 관련 주식이 25% 상승합니다.', { targetStockChangePct: 25, stockSymbols: TECH_STOCKS }),
  event('consumerBoom', '주식시장', '소비 열풍', '유통·식품·여행 관련 주식이 20% 상승합니다.', { targetStockChangePct: 20, stockSymbols: CONSUMER_STOCKS }),

  event('priceRise', '세금·물가', '물가 상승', '모든 물품 가격이 10% 상승합니다.', { priceMultiplier: 1.1 }),
  event('priceStable', '세금·물가', '물가 안정', '모든 물품 가격이 10% 하락합니다.', { priceMultiplier: 0.9 }),
  event('classSuccess', '학급 특별', '학급 공동사업 성공', '모든 학생에게 70을 지급합니다.', { cashDelta: 70 }),
  event('classFailure', '학급 특별', '학급 공동사업 실패', '모든 학생이 20씩 분담합니다.', { cashDelta: -20 }),
  event('goldenWeek', '학급 특별', '황금 경제 주간', '다음 이벤트의 지원·수익 효과를 1.5배로 적용합니다.', { nextMultiplier: 1.5 }),
];

export function eventById(id) {
  return ECONOMY_EVENTS.find((item) => item.id === id) || null;
}

function resolveEvent(current) {
  if (!current) return null;
  const definition = eventById(current.id);
  return definition ? { ...definition, ...current, effects: { ...definition.effects, ...(current.effects || {}) } } : current;
}

export function activeEconomyEvents(klass = {}) {
  const stored = Array.isArray(klass.economyEvents) && klass.economyEvents.length
    ? klass.economyEvents
    : (klass.economyEvent ? [klass.economyEvent] : []);
  return stored.map(resolveEvent).filter(Boolean);
}

export function activeEconomyEvent(klass = {}) {
  return activeEconomyEvents(klass)[0] || null;
}

function eventMultiplierOf(event = {}) {
  const value = Number(event.multiplier);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function eventMultiplier(klass = {}) {
  return eventMultiplierOf(activeEconomyEvent(klass));
}

export function eventEffect(klass = {}, key, fallback = 0) {
  const events = activeEconomyEvents(klass);
  const values = events
    .map((event) => {
      const value = Number(event.effects?.[key]);
      return Number.isFinite(value) ? value * eventMultiplierOf(event) : null;
    })
    .filter((value) => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : fallback;
}

export function eventPriceMultiplier(klass = {}) {
  return activeEconomyEvents(klass).reduce((total, event) => {
    const value = Number(event.effects?.priceMultiplier);
    if (!Number.isFinite(value) || value <= 0) return total;
    const adjusted = 1 + (value - 1) * eventMultiplierOf(event);
    return total * Math.max(0, adjusted);
  }, 1);
}

export function depositRateFor(klass = {}) {
  const base = Math.max(0, Number(klass.depositRate) || 0);
  const rate = base + eventEffect(klass, 'depositRateDelta', 0);
  const { maintenance, interest } = activeEconomyEvents(klass).reduce((result, event) => {
    const maintenanceValue = Number(event.effects?.depositRateMultiplier);
    const interestValue = Number(event.effects?.depositInterestMultiplier);
    if (Number.isFinite(maintenanceValue)) result.maintenance *= maintenanceValue;
    if (Number.isFinite(interestValue) && interestValue > 0) result.interest *= interestValue;
    return result;
  }, { maintenance: 1, interest: 1 });
  return Math.max(0, rate * maintenance * interest);
}

export function withdrawalFeeFor(klass = {}) {
  return Math.max(0, Math.floor(eventEffect(klass, 'withdrawalFee', 0)));
}

export function savingsSignupBonusFor(klass = {}) {
  return Math.max(0, Math.floor(eventEffect(klass, 'savingsSignupBonus', 0)));
}

export function loanRateAdjustmentFor(klass = {}) {
  return eventEffect(klass, 'loanRateDelta', 0);
}

export function loanLimitMultiplierFor(klass = {}) {
  return Math.max(0.1, activeEconomyEvents(klass).reduce((total, event) => {
    const value = Number(event.effects?.loanLimitMultiplier);
    return Number.isFinite(value) && value > 0 ? total * value : total;
  }, 1));
}

function signedNumber(value) {
  const rounded = Math.round(Number(value) || 0);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function percentDelta(value) {
  const delta = (Number(value) - 1) * 100;
  return `${delta > 0 ? '+' : ''}${Math.round(delta)}%`;
}

export function eventEffectSummary(event = {}) {
  const effects = event.effects || {};
  const items = [];
  if (Number(effects.cashDelta)) items.push(`학생 현금 ${signedNumber(effects.cashDelta)}`);
  if (Number(effects.depositHolderDelta)) items.push(`예금 보유자 ${signedNumber(effects.depositHolderDelta)}`);
  if (Number(effects.priceMultiplier)) items.push(`물품 가격 ${percentDelta(effects.priceMultiplier)}`);
  if (Number(effects.stockChangePct)) items.push(`전체 주식 ${signedNumber(effects.stockChangePct)}%`);
  if (Number(effects.targetStockChangePct)) items.push(`관련 주식 ${signedNumber(effects.targetStockChangePct)}%`);
  if (Number(effects.depositRateDelta)) items.push(`예금 이율 ${signedNumber(effects.depositRateDelta)}%p`);
  if (Number(effects.depositInterestMultiplier)) items.push(`예금 이자 ×${effects.depositInterestMultiplier}`);
  if (Number(effects.savingsSignupBonus)) items.push(`적금 신규 가입 +${Math.round(effects.savingsSignupBonus)}`);
  if (Number(effects.withdrawalFee)) items.push(`예금 출금 수수료 ${Math.round(effects.withdrawalFee)}`);
  if (Number(effects.loanRateDelta)) items.push(`대출 이율 ${signedNumber(effects.loanRateDelta)}%p`);
  if (Number(effects.loanLimitMultiplier)) items.push(`대출 한도 ×${effects.loanLimitMultiplier}`);
  if (Number(effects.nextMultiplier)) items.push(`다음 이벤트 ×${effects.nextMultiplier}`);
  return items.join(' · ') || '효과 적용';
}
