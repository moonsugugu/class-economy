export const MAX_SEAT_PRIORITY_RANK = 5;
export const DEFAULT_SEAT_PRIORITY_SLOTS = 5;
export const DEFAULT_SEAT_PRIORITY_BASE_PRICE = 1000;
export const DEFAULT_SEAT_PRIORITY_STEP = 100;

export function prioritySlots(value) {
  const n = Math.floor(Number(value));
  return Math.max(1, Math.min(MAX_SEAT_PRIORITY_RANK, Number.isFinite(n) ? n : DEFAULT_SEAT_PRIORITY_SLOTS));
}

export function priorityBasePrice(value) {
  const n = Math.floor(Number(value));
  return Math.max(DEFAULT_SEAT_PRIORITY_BASE_PRICE, Number.isFinite(n) ? n : DEFAULT_SEAT_PRIORITY_BASE_PRICE);
}

export function priorityStep(value) {
  const n = Math.floor(Number(value));
  return Math.max(0, Number.isFinite(n) ? n : DEFAULT_SEAT_PRIORITY_STEP);
}

export function priorityRankPrice(market, rank) {
  const base = priorityBasePrice(market?.basePrice);
  const step = priorityStep(market?.step);
  return base + Math.max(0, Math.floor(Number(rank) || 1) - 1) * step;
}

export function priorityRankLabel(rank) {
  return `${rank}등 선택권`;
}
