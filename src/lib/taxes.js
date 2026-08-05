// 공동기금에 모이는 거래별 세금 규칙입니다.
// 기존 taxRate는 월급 세율로 계속 읽고, 새 항목이 없으면 같은 비율을 기본값으로 사용해요.
export const TAX_PARTS = [
  { key: 'salary', field: 'taxSalaryRate', label: '월급', description: '선생님이 월급을 지급할 때' },
  { key: 'shop', field: 'taxShopRate', label: '학급 상점', description: '학생이 선생님 상점 상품을 살 때' },
  { key: 'seat', field: 'taxSeatRate', label: '자리 구입', description: '학생이 자리 경매에 입찰할 때' },
  { key: 'item', field: 'taxItemRate', label: '공간·용사 아이템', description: '내 공간 또는 용사 상점 아이템을 살 때' },
  { key: 'stockBuy', field: 'taxStockBuyRate', label: '주식 매수', description: '주식을 살 때' },
  { key: 'stockSell', field: 'taxStockSellRate', label: '주식 매도', description: '주식을 팔 때' },
];

// 거래 때마다 공동기금 본체를 갱신하지 않고, 이 한 문서에 누적해요.
// 선생님이 공동기금 화면에서 정산할 때만 fund로 옮깁니다.
export const TAX_LEDGER_ID = 'pending';

const clampRate = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
};

export function taxRates(klass = {}) {
  const legacy = clampRate(klass.taxRate, 10);
  return Object.fromEntries(TAX_PARTS.map(({ key, field }) => [
    key,
    clampRate(klass[field], legacy),
  ]));
}

// 소수점 이하는 버려서 항상 정수 세금만 만들어요.
export function taxOfAmount(amount, rate) {
  const base = Math.max(0, Number(amount) || 0);
  const percent = clampRate(rate, 0);
  const tax = Math.floor(base * percent / 100);
  return { base, tax, total: base + tax, net: Math.max(0, base - tax) };
}

export function taxForPart(amount, klass, part) {
  return taxOfAmount(amount, taxRates(klass)[part] ?? 0);
}

export function taxFieldFor(part) {
  return TAX_PARTS.find((entry) => entry.key === part)?.field || 'taxRate';
}
