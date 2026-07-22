// 한국 대표주 10개 + 미국 대표주 10개.
// 가격은 학급 화폐 규모에 맞춘 시뮬레이션 기준가이며, 실제 시세와 다릅니다.
export const STOCK_SEED = [
  { symbol: 'SAMSUNG', name: '삼성전자', market: 'KR', base: 70 },
  { symbol: 'SKHYNIX', name: 'SK하이닉스', market: 'KR', base: 180 },
  { symbol: 'LGES', name: 'LG에너지솔루션', market: 'KR', base: 350 },
  { symbol: 'HYUNDAI', name: '현대자동차', market: 'KR', base: 210 },
  { symbol: 'KIA', name: '기아', market: 'KR', base: 100 },
  { symbol: 'NAVER', name: '네이버', market: 'KR', base: 190 },
  { symbol: 'KAKAO', name: '카카오', market: 'KR', base: 45 },
  { symbol: 'SAMBIO', name: '삼성바이오로직스', market: 'KR', base: 800 },
  { symbol: 'POSCO', name: 'POSCO홀딩스', market: 'KR', base: 280 },
  { symbol: 'CELLTRION', name: '셀트리온', market: 'KR', base: 170 },
  { symbol: 'AAPL', name: '애플', market: 'US', base: 230 },
  { symbol: 'MSFT', name: '마이크로소프트', market: 'US', base: 420 },
  { symbol: 'NVDA', name: '엔비디아', market: 'US', base: 130 },
  { symbol: 'GOOGL', name: '알파벳(구글)', market: 'US', base: 170 },
  { symbol: 'AMZN', name: '아마존', market: 'US', base: 190 },
  { symbol: 'TSLA', name: '테슬라', market: 'US', base: 250 },
  { symbol: 'META', name: '메타(페이스북)', market: 'US', base: 500 },
  { symbol: 'NFLX', name: '넷플릭스', market: 'US', base: 650 },
  { symbol: 'KO', name: '코카콜라', market: 'US', base: 62 },
  { symbol: 'MCD', name: '맥도날드', market: 'US', base: 290 },
];

// 랜덤워크: 한 틱에 최대 ±3% 변동
export function nextPrice(price) {
  const change = (Math.random() - 0.5) * 0.06;
  return Math.max(1, Math.round(price * (1 + change)));
}

export function changePct(stock) {
  if (!stock.prevClose) return 0;
  return ((stock.price - stock.prevClose) / stock.prevClose) * 100;
}
