/* =====================================================================
   🧑‍🍳 학급 직업 — 1인 1역을 "일하고 급여를 받는" 경험으로
   ===================================================================== */

/** 선생님이 한 번에 담을 수 있는 직업 예시 (학급 1인 1역 기반) */
export const JOB_PRESETS = [
  { emoji: '🏦', name: '은행원', salary: 60, slots: 2, desc: '친구들의 예금·적금 상담을 도와줘요' },
  { emoji: '📚', name: '사서', salary: 50, slots: 2, desc: '학급 문고를 정리하고 대출을 관리해요' },
  { emoji: '🥛', name: '우유 당번', salary: 40, slots: 2, desc: '우유를 나눠주고 상자를 정리해요' },
  { emoji: '🌱', name: '화분 관리사', salary: 35, slots: 1, desc: '교실 화분에 물을 주고 돌봐요' },
  { emoji: '🧹', name: '환경부장', salary: 55, slots: 2, desc: '청소 상태를 점검하고 분리수거를 챙겨요' },
  { emoji: '📰', name: '학급 기자', salary: 65, slots: 1, desc: '학급 소식을 취재해 뉴스로 알려줘요' },
  { emoji: '⚽', name: '체육부장', salary: 50, slots: 2, desc: '체육 시간 준비물과 줄서기를 도와요' },
  { emoji: '🍚', name: '급식 도우미', salary: 55, slots: 2, desc: '급식 배식과 정리를 도와줘요' },
  { emoji: '🖥️', name: '컴퓨터 관리사', salary: 60, slots: 1, desc: 'TV·컴퓨터를 켜고 끄고 관리해요' },
  { emoji: '📗', name: '칠판 당번', salary: 40, slots: 2, desc: '칠판을 깨끗하게 지우고 분필을 챙겨요' },
  { emoji: '🎵', name: '음악 담당', salary: 45, slots: 1, desc: '아침 음악과 알림 소리를 담당해요' },
  { emoji: '🚪', name: '문단속 담당', salary: 35, slots: 1, desc: '창문과 전등을 마지막에 확인해요' },
];

/** 투표 선택지 예시 (공동기금 사용처) */
export const POLL_PRESETS = [
  {
    title: '공동기금으로 무엇을 살까요?',
    options: [
      { emoji: '🍿', text: '학급 영화 상영회' },
      { emoji: '🎲', text: '새 보드게임' },
      { emoji: '🍪', text: '간식 파티' },
      { emoji: '🌱', text: '교실 화분과 꾸미기' },
    ],
  },
  {
    title: '학급 규칙을 정해요',
    options: [
      { emoji: '📵', text: '쉬는시간 휴대폰 금지' },
      { emoji: '🤫', text: '수업 중 조용히 하기' },
      { emoji: '🤝', text: '고운 말 쓰기' },
    ],
  },
];

/** 총 급여 = 기본 월급 + 직업 수당 */
export function grossPay(klass, job) {
  return Number(klass?.salary || 0) + Number(job?.salary || 0);
}

/** 세금(원 단위 내림)과 실수령액 */
export function taxOf(gross, taxRate) {
  const tax = Math.floor(gross * (Number(taxRate || 0) / 100));
  return { tax, net: gross - tax };
}
