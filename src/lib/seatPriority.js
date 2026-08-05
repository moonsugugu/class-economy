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
  const slots = prioritySlots(market?.slots);
  const normalizedRank = Math.max(1, Math.min(slots, Math.floor(Number(rank) || 1)));
  // 1등에게 가장 먼저 고를 권리가 있으므로 가장 비싸고, 뒤 순위일수록 낮아져요.
  return base + Math.max(0, slots - normalizedRank) * step;
}

export function priorityRankLabel(rank) {
  return `${rank}등 선택권`;
}
