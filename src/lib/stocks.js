// 한국 대표주 20개 + 미국 대표주 20개.
// 가격 단위는 실제와 같습니다 — 한국 주식은 원(₩) 그대로, 미국 주식은 달러($) 그대로.
// (예: 삼성전자 70,800원 → 70,800 학급화폐)
// base는 실제 시세를 아직 못 불러왔을 때 쓰는 시작값이에요.
export const STOCK_SEED = [
  { symbol: 'SAMSUNG', name: '삼성전자', market: 'KR', base: 75000 },
  { symbol: 'SKHYNIX', name: 'SK하이닉스', market: 'KR', base: 200000 },
  { symbol: 'LGES', name: 'LG에너지솔루션', market: 'KR', base: 400000 },
  { symbol: 'HYUNDAI', name: '현대자동차', market: 'KR', base: 250000 },
  { symbol: 'KIA', name: '기아', market: 'KR', base: 110000 },
  { symbol: 'NAVER', name: '네이버', market: 'KR', base: 200000 },
  { symbol: 'KAKAO', name: '카카오', market: 'KR', base: 45000 },
  { symbol: 'SAMBIO', name: '삼성바이오로직스', market: 'KR', base: 950000 },
  { symbol: 'POSCO', name: 'POSCO홀딩스', market: 'KR', base: 350000 },
  { symbol: 'CELLTRION', name: '셀트리온', market: 'KR', base: 180000 },
  { symbol: 'LGCHEM', name: 'LG화학', market: 'KR', base: 300000 },
  { symbol: 'SAMSUNGSDI', name: '삼성SDI', market: 'KR', base: 250000 },
  { symbol: 'HYUNDAIMOBIS', name: '현대모비스', market: 'KR', base: 230000 },
  { symbol: 'KBFIN', name: 'KB금융', market: 'KR', base: 90000 },
  { symbol: 'SHINHAN', name: '신한지주', market: 'KR', base: 60000 },
  { symbol: 'HANWHA', name: '한화에어로스페이스', market: 'KR', base: 700000 },
  { symbol: 'HDHYNDAI', name: 'HD현대중공업', market: 'KR', base: 300000 },
  { symbol: 'DOOSAN', name: '두산에너빌리티', market: 'KR', base: 30000 },
  { symbol: 'KTNG', name: 'KT&G', market: 'KR', base: 110000 },
  { symbol: 'KAKAOBANK', name: '카카오뱅크', market: 'KR', base: 30000 },
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
  { symbol: 'AVGO', name: '브로드컴', market: 'US', base: 1800 },
  { symbol: 'ORCL', name: '오라클', market: 'US', base: 180 },
  { symbol: 'AMD', name: 'AMD', market: 'US', base: 160 },
  { symbol: 'JPM', name: 'JP모건', market: 'US', base: 250 },
  { symbol: 'V', name: '비자', market: 'US', base: 350 },
  { symbol: 'WMT', name: '월마트', market: 'US', base: 100 },
  { symbol: 'COST', name: '코스트코', market: 'US', base: 900 },
  { symbol: 'DIS', name: '디즈니', market: 'US', base: 110 },
  { symbol: 'PEP', name: '펩시코', market: 'US', base: 150 },
  { symbol: 'INTC', name: '인텔', market: 'US', base: 25 },
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
   예전: classes/{id}/stocks/{종목} 문서 여러 개 → 시세 변동 1회에 읽기 440회 이상
   지금: classes/{id}/market/main 문서 1개  → 시세 변동 1회에 읽기 약 21회
   ===================================================================== */
export const MARKET_PATH = (classId) => ['classes', classId, 'market', 'main'];

/** 오늘 날짜 키 (로컬 기준 YYYY-MM-DD) — 하루 변동 횟수 초기화에 사용 */
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const MAX_TICK_LIMIT = 25;       // 선생님이 설정할 수 있는 하루 최대 횟수
export const DEFAULT_TICK_LIMIT = 25;   // 하루 시세 변동 기본 횟수
export const AUTO_TICK_MS = 119000;     // 자동 변동: 1분 59초
export const HISTORY_LEN = 40;          // 미니 차트에 쓰는 최근 시세 개수

export function normalizedTickLimit(value) {
  const n = Number(value);
  return Math.max(1, Math.min(MAX_TICK_LIMIT, Number.isFinite(n) ? Math.floor(n) : DEFAULT_TICK_LIMIT));
}

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

/** 기존 시장 문서를 보존하면서 새 기본 종목만 뒤에 추가합니다. */
export function mergeSeedStocks(stocks = []) {
  const existing = new Set(stocks.map((s) => s.symbol));
  const additions = STOCK_SEED
    .filter((s) => !existing.has(s.symbol))
    .map((s) => ({
      symbol: s.symbol, name: s.name, market: s.market,
      price: s.base, prevClose: s.base, history: [s.base],
    }));
  return [...stocks, ...additions];
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
  const raw = newPrice ?? nextPrice(stock.price);
  // 큰 금액(한국 주식)은 원 단위, 작은 금액(달러)은 센트까지
  const p = Math.max(0.01, raw >= 1000 ? Math.round(raw) : Math.round(raw * 100) / 100);
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

/**
 * 실제 시세 가져오기 — 서버리스 함수(/api/quotes)가 대신 불러와 줍니다.
 * 반환: { prices: {종목코드: 가격}, fx: 원/달러 환율 }
 */
export async function fetchRealQuotes() {
  const configured = import.meta.env.VITE_QUOTES_API_URL;
  const endpoints = [...new Set([configured, '/api/quotes', '/api/quotes/'].filter(Boolean))];
  let lastDetail = '시세 응답이 비어 있어요.';

  for (const endpoint of endpoints) {
    try {
      const r = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const contentType = r.headers.get('content-type') || '';
      const text = await r.text();
      let j = null;
      try { j = JSON.parse(text); } catch { /* 정적 서버가 돌려준 HTML이면 다음 경로를 시도해요. */ }
      if (r.ok && j?.ok && j.prices) return j;
      lastDetail = j?.error || (!contentType.includes('json')
        ? '시세 API가 JSON으로 배포되지 않았어요.'
        : '시세 응답이 비어 있어요.');
    } catch (error) {
      lastDetail = error?.message || lastDetail;
    }
  }

  throw new Error(`실제 시세를 불러오지 못했어요. (${lastDetail})`);
}

/** 실제 시세를 종목 목록에 반영 (우리 반 종목은 그대로 두고 살짝만 움직여요) */
export function applyRealPrices(stocks, prices) {
  return (stocks || []).map((s) => {
    const real = prices[s.symbol];
    if (typeof real === 'number' && real > 0) return advance(s, real);
    return s.market === 'CUSTOM' ? advance(s) : s; // 우리 반 종목은 시뮬레이션
  });
}

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

/* =====================================================================
   화폐 단위 정리
   - 학급화폐(UNIT): 미소·미역처럼 선생님이 정한 우리 반 돈
   - 원(KRW): 한국 주식을 살 때 쓰는 돈
   - 달러(USD): 미국 주식을 살 때 쓰는 돈
   krwPerUnit = 학급화폐 1개가 몇 원인지 (기본 1 → 1미역 = 1원)
   ===================================================================== */
export const DEFAULT_KRW_PER_UNIT = 1;

/** 종목을 어떤 돈으로 사고파는지 */
export const stockCur = (s) => (s.market === 'US' ? 'USD' : s.market === 'KR' ? 'KRW' : 'UNIT');

/** 그 돈이 학생 문서의 어떤 지갑인지 */
export const WALLET_FIELD = { KRW: 'krw', USD: 'usd', UNIT: 'cash' };

/** 어떤 돈이든 학급화폐 값으로 환산 */
export function toUnits(amount, cur, fx, krwPerUnit) {
  const k = Number(krwPerUnit) || 1;
  if (cur === 'KRW') return amount / k;
  if (cur === 'USD') return (amount * (fx || DEFAULT_FX)) / k;
  return amount;
}

/** 환율 (미국 주식은 달러로 사고팔아요) */
export const DEFAULT_FX = 1300;          // 1달러 = 1300원
export const FX_BAND = 0.02;             // 환율도 살짝씩 움직여요 (±2%)
export function nextFx(fx) {
  const v = Math.round(fx * (1 + (Math.random() - 0.5) * FX_BAND * 2));
  return Math.min(2000, Math.max(800, v));
}
