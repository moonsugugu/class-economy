export const DEFAULT_LOTTERY_PRICE = 10;
// 확률은 학생 화면에 표시하는 퍼센트 단위입니다. 0.01 = 0.01%입니다.
export const DEFAULT_LOTTERY_WIN_PROBABILITY = 0.01;
export const DEFAULT_LOTTERY_SUPPORT_RATE = 50;
export const DEFAULT_LOTTERY_RECIPIENTS = 5;
export const DEFAULT_LOTTERY_DISTRIBUTION_RATE = 100;
export const DEFAULT_LOTTERY_PRIZE = 1000;

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};

export function lotterySettings(klass = {}) {
  return {
    price: Math.floor(clamp(klass.lotteryPrice, 1, 100000, DEFAULT_LOTTERY_PRICE)),
    probability: clamp(
      klass.lotteryWinProbability,
      0,
      100,
      DEFAULT_LOTTERY_WIN_PROBABILITY,
    ),
    supportRate: clamp(
      klass.lotterySupportRate,
      0,
      100,
      DEFAULT_LOTTERY_SUPPORT_RATE,
    ),
    recipients: Math.floor(clamp(
      klass.lotterySupportRecipients,
      1,
      100,
      DEFAULT_LOTTERY_RECIPIENTS,
    )),
    distributionRate: clamp(
      klass.lotteryDistributionRate,
      0,
      100,
      DEFAULT_LOTTERY_DISTRIBUTION_RATE,
    ),
    prize: Math.floor(clamp(klass.lotteryPrize, 0, 1000000, DEFAULT_LOTTERY_PRIZE)),
  };
}

// 월요일부터 시작하는 ISO 주차 키. 학생 한 명당 같은 주차 키로 한 번만 살 수 있습니다.
export function lotteryWeekKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
