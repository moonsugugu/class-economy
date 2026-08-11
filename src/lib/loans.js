import { DAY_MS, WEEK_MS } from './util.js';
import { loanLimitMultiplierFor, loanRateAdjustmentFor } from './economyEvents.js';

export const LOAN_TERM_MS = WEEK_MS;
export const DEFAULT_LOAN_RATE = 10;
export const DEFAULT_LOAN_LIMIT = 1000;
export const BANKRUPTCY_GRANT = 200;

export function loanRateFor(klass = {}) {
  const rate = Number(klass.loanRate);
  const base = Number.isFinite(rate) ? rate : DEFAULT_LOAN_RATE;
  return Math.max(0, Math.min(1000, base + loanRateAdjustmentFor(klass)));
}

export function loanLimitFor(klass = {}) {
  const limit = Number(klass.loanLimit);
  const base = Math.max(0, Number.isFinite(limit) ? limit : DEFAULT_LOAN_LIMIT);
  const multiplier = Number(klass.loanLimitMultiplier);
  const configured = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return Math.floor(base * configured * loanLimitMultiplierFor(klass));
}

export function loanOverdueDays(loan = {}, now = Date.now()) {
  const dueAt = Number(loan.dueAt) || 0;
  if (!dueAt || now <= dueAt) return 0;
  return Math.max(1, Math.ceil((now - dueAt) / DAY_MS));
}

export function loanInterestRate(loan = {}, now = Date.now()) {
  const rate = Math.max(0, Number(loan.rate) || 0);
  return rate + loanOverdueDays(loan, now);
}

export function loanDueAmount(loan = {}, now = Date.now()) {
  const principal = Math.max(0, Number(loan.principal) || 0);
  const rate = loanInterestRate(loan, now);
  return principal + Math.floor(principal * rate / 100);
}

export function loanOutstanding(loan = {}, now = Date.now()) {
  if (!['active', 'overdue'].includes(loan.status)) return 0;
  return loanDueAmount(loan, now);
}

export function loanIsDue(loan = {}, now = Date.now()) {
  return Number(loan.dueAt) <= now;
}

export function loanStatus(loan = {}, now = Date.now()) {
  if (loan.status === 'active' && loanIsDue(loan, now)) return 'overdue';
  return loan.status || 'active';
}
