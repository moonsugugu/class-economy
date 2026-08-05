// 학급별 물가 조정값을 모든 구매 화면에서 동일하게 적용해요.
// 기존 학급에는 값이 없으므로 기본값 0으로 원래 가격을 그대로 유지합니다.
import { eventPriceMultiplier } from './economyEvents.js';

export const PRICE_MODE_UNIT = 'unit';
export const PRICE_MODE_PERCENT = 'percent';

export function pricePolicy(klass = {}) {
  const mode = klass.priceInflationMode === PRICE_MODE_PERCENT ? PRICE_MODE_PERCENT : PRICE_MODE_UNIT;
  const raw = Number(klass.priceInflationValue);
  const value = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  return {
    mode,
    value: mode === PRICE_MODE_PERCENT ? Math.min(1000, value) : Math.min(1000000, value),
  };
}

export function itemPrice(basePrice, klass = {}) {
  const eventAdjustedBase = (Number(basePrice) || 0) * eventPriceMultiplier(klass);
  const base = Math.max(0, eventAdjustedBase);
  const policy = pricePolicy(klass);
  if (policy.mode === PRICE_MODE_PERCENT) {
    return Math.max(0, Math.round(base * (1 + policy.value / 100)));
  }
  return Math.max(0, Math.round(base + policy.value));
}

export function pricePolicyLabel(klass = {}, currency = '포인트') {
  const policy = pricePolicy(klass);
  if (!policy.value) return '현재 물가 조정 없음';
  return policy.mode === PRICE_MODE_PERCENT
    ? `기본 가격 + ${policy.value}%`
    : `기본 가격 + ${policy.value}${currency}`;
}
