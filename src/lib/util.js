export function fmt(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

export function makeClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

/** 랭킹 기간 키 — 오늘 / 이번 주 / 이번 달 */
export function periodKeys(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const day = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  // ISO 주차 계산
  const t = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const week = Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
  return {
    d: day,
    w: `${t.getUTCFullYear()}-W${p(week)}`,
    m: `${now.getFullYear()}-${p(now.getMonth() + 1)}`,
  };
}

/** 랭킹·수익률 계산에 쓰는 자산 정의 (현금 + 예금 + 달러 + 주식평가액) */
export function rankAssets(student, stocks, fx) {
  const holdings = student.holdings || {};
  const stockValue = Object.entries(holdings).reduce((a, [sym, h]) => {
    const st = stocks.find((s) => (s.symbol || s.id) === sym);
    if (!st || !h.qty) return a;
    const v = st.price * h.qty;
    return a + (st.market === 'US' ? v * fx : v); // 미국 주식은 달러 → 학급 화폐로 환산
  }, 0);
  return Math.round((student.cash || 0) + (student.deposit || 0) + (student.usd || 0) * fx + stockValue);
}

/** 적금 가입 기간 선택지 (오래 맡길수록 이율 우대) */
export const SAVINGS_TERMS = [7, 14, 21];

/**
 * 적금 이율(주당 %) — 기간이 한 주 늘어날 때마다 1%p씩 높아져요.
 * 예) 기본 5% → 7일 5% / 14일 6% / 21일 7%
 */
export function savingsRateFor(baseRate, days) {
  const weeks = Math.max(1, Math.round(Number(days) / 7));
  return Number(baseRate || 0) + (weeks - 1);
}

/** 만기에 받는 금액 (원금 + 기간만큼의 이자) */
export function savingsPayout(amount, rate, days) {
  const weeks = Math.max(1, Math.round(Number(days) / 7));
  return Math.floor(Number(amount) * (1 + (Number(rate) / 100) * weeks));
}
