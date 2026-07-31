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

/* =====================================================================
   시장 데이터 구조 (비용 최적화)
   예전: classes/{id}/stocks/{종목} 문서 20개 → 시세 변동 1회에 읽기 440회
   지금: classes/{id}/market/main 문서 1개  → 시세 변동 1회에 읽기 약 21회
   ===================================================================== */
export const MARKET_PATH = (classId) => ['classes', classId, 'market', 'main'];

/** 오늘 날짜 키 (로컬 기준 YYYY-MM-DD) — 하루 변동 횟수 초기화에 사용 */
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const DEFAULT_TICK_LIMIT = 10;   // 하루 시세 변동 기본 횟수
export const HISTORY_LEN = 40;          // 미니 차트에 쓰는 최근 시세 개수

/** 처음 시장을 열 때 쓰는 초기 데이터 */
export function makeInitialMarket() {
  return {
    stocks: STOCK_SEED.map((s) => ({
      symbol: s.symbol, name: s.name, market: s.market,
      price: s.base, prevClose: s.base, history: [s.base],
    })),
    tickCount: 0,
    tickDate: todayKey(),
    fx: DEFAULT_FX,
    schedDone: dueScheduleKeys(), // 시장을 연 시점의 예약분은 이미 지난 것으로 처리
    updatedAt: Date.now(),
  };
}

/** 선생님이 직접 만드는 우리 반 종목 */
export function makeCustomStock(name, price) {
  return {
    // 종목 코드는 학생 보유 내역(holdings)의 키가 되므로 절대 겹치지 않게 생성
    symbol: 'C' + Date.now().toString(36).toUpperCase(),
    name,
    market: 'CUSTOM',
    price,
    prevClose: price,
    history: [price],
  };
}

/** 시세를 한 칸 진행시킨 종목 (수동 지정 가격도 같은 함수로 처리) */
export function advance(stock, newPrice) {
  const p = Math.max(1, Math.round(newPrice ?? nextPrice(stock.price)));
  return {
    ...stock,
    prevClose: stock.price,
    price: p,
    history: [...(stock.history || []).slice(-(HISTORY_LEN - 1)), p],
  };
}

/** 오늘 이미 사용한 시세 변동 횟수 (날짜가 바뀌면 0부터) */
export function usedTicks(market) {
  if (!market) return 0;
  return market.tickDate === todayKey() ? (market.tickCount || 0) : 0;
}

export const MARKET_LABEL = { KR: '🇰🇷', US: '🇺🇸', CUSTOM: '🏫' };

/* =====================================================================
   예약 시세 변동 — 선생님이 버튼을 누르지 않아도
   매일 아침 8:30 / 오후 3:00 에 딱 한 번씩만 저절로 변동돼요.
   (서버가 없으므로, 그 시각 이후 누군가 앱을 열 때 딱 1회 처리됩니다)
   ===================================================================== */
export const SCHEDULE_HOURS = [8.5, 15]; // 08:30, 15:00
export const SCHEDULE_LABEL = '매일 아침 8:30 · 오후 3:00';

/** 오늘 이미 지나간 예약 시각들의 키 */
export function dueScheduleKeys(now = new Date()) {
  const cur = now.getHours() + now.getMinutes() / 60;
  return SCHEDULE_HOURS.filter((h) => cur >= h).map((h) => `${todayKey()}@${h}`);
}

/** 아직 처리되지 않은 예약 변동 목록 (이미 받아온 데이터로 판단 — 추가 읽기 없음) */
export function pendingSchedule(market) {
  if (!market) return [];
  const done = market.schedDone || [];
  return dueScheduleKeys().filter((k) => !done.includes(k));
}

/** 환율 (미국 주식은 달러로 사고팔아요) */
export const DEFAULT_FX = 1300;          // 1달러 = 1300 학급화폐
export const FX_BAND = 0.02;             // 환율도 살짝씩 움직여요 (±2%)
export function nextFx(fx) {
  const v = Math.round(fx * (1 + (Math.random() - 0.5) * FX_BAND * 2));
  return Math.min(2000, Math.max(800, v));
}
