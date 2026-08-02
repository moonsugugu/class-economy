/* =====================================================================
   실제 주식 시세 가져오기 (Vercel 서버리스 함수)
   브라우저에서 직접 금융 사이트를 부르면 CORS로 막히기 때문에,
   서버에서 대신 불러와 우리 앱에 넘겨줍니다.

   - 한국 주식: 원(₩) 단위 그대로 (예: 삼성전자 262,500 → 262,500 학급화폐)
   - 미국 주식: 달러($) 단위 그대로
   ===================================================================== */

// 우리 앱 종목코드 → 야후 파이낸스 심볼
const SYMBOL_MAP = {
  SAMSUNG: '005930.KS', SKHYNIX: '000660.KS', LGES: '373220.KS',
  HYUNDAI: '005380.KS', KIA: '000270.KS', NAVER: '035420.KS',
  KAKAO: '035720.KS', SAMBIO: '207940.KS', POSCO: '005490.KS',
  CELLTRION: '068270.KS',
  AAPL: 'AAPL', MSFT: 'MSFT', NVDA: 'NVDA', GOOGL: 'GOOGL',
  AMZN: 'AMZN', TSLA: 'TSLA', META: 'META', NFLX: 'NFLX',
  KO: 'KO', MCD: 'MCD',
};

const FX_SYMBOL = 'USDKRW=X'; // 원/달러 환율

/** 종목 하나의 현재가를 가져와요 (실패하면 null) */
async function priceOf(yahooSymbol) {
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
      '?interval=1d&range=1d';
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const v = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof v === 'number' && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // 같은 값을 5분 동안 재사용해서 호출 수를 아껴요
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');

  const entries = Object.entries(SYMBOL_MAP);
  const results = await Promise.all(entries.map(([, yh]) => priceOf(yh)));

  const prices = {};
  entries.forEach(([ours], i) => {
    const v = results[i];
    // 한국 주식은 원 단위라 정수로, 미국 주식은 달러라 소수 둘째 자리까지
    if (v != null) prices[ours] = v >= 1000 ? Math.round(v) : Math.round(v * 100) / 100;
  });

  const fxRaw = await priceOf(FX_SYMBOL);
  const fx = fxRaw ? Math.round(fxRaw) : null;

  if (!Object.keys(prices).length) {
    return res.status(502).json({ ok: false, error: '시세 서버에서 값을 받지 못했어요' });
  }
  return res.status(200).json({ ok: true, prices, fx, at: Date.now() });
}
