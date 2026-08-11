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

/**
 * 총자산 (전부 학급화폐로 환산)
 * = 현금 + 예금 + 원화지갑 + 달러지갑 + 주식 평가액
 * krwPerUnit: 학급화폐 1개가 몇 원인지 (기본 1)
 */
export function rankAssets(student, stocks, fx, krwPerUnit = 1) {
  const k = Number(krwPerUnit) || 1;
  const conv = (amount, market) => {
    if (market === 'US') return (amount * (fx || 1300)) / k; // 달러 → 원 → 학급화폐
    if (market === 'KR') return amount / k;                  // 원 → 학급화폐
    return amount;                                           // 우리 반 종목은 학급화폐
  };
  const stockValue = Object.entries(student.holdings || {}).reduce((a, [sym, h]) => {
    const st = stocks.find((s) => (s.symbol || s.id) === sym);
    if (!st || !h.qty) return a;
    return a + conv(st.price * h.qty, st.market);
  }, 0);
  return Math.round(
    (student.cash || 0)
    + (student.deposit || 0)
    + (student.krw || 0) / k
    + ((student.usd || 0) * (fx || 1300)) / k
    + stockValue
  );
}

/**
 * 학생의 순자산. 기존 자산 계산에 적금과 아직 갚지 않은 대출을 더해
 * 파산 여부를 판단할 때 사용합니다. 대출은 원금과 만기 이자를 함께 부채로 봅니다.
 */
export function netAssets(student = {}, stocks = [], fx, krwPerUnit = 1, savings = [], loans = []) {
  const savingsValue = savings.reduce((total, account) => total + (Number(account.amount) || 0), 0);
  const loanLiability = loans
    .filter((loan) => ['active', 'overdue'].includes(loan.status))
    .reduce((total, loan) => {
      const principal = Math.max(0, Number(loan.principal) || 0);
      const rate = Math.max(0, Number(loan.rate) || 0);
      const dueAt = Number(loan.dueAt) || 0;
      const overdueDays = dueAt && Date.now() > dueAt
        ? Math.max(1, Math.ceil((Date.now() - dueAt) / DAY_MS))
        : 0;
      return total + principal + Math.floor(principal * (rate + overdueDays) / 100);
    }, 0);
  return Math.round(rankAssets(student, stocks, fx, krwPerUnit) + savingsValue - loanLiability);
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
