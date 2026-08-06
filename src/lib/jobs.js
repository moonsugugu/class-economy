/* =====================================================================
   🧑‍🍳 학급 직업 — 1인 1역을 "일하고 급여를 받는" 경험으로
   ===================================================================== */

/** 선생님이 한 번에 담을 수 있는 직업 예시 (학급 1인 1역 기반) */
export const JOB_PRESETS = [
  { emoji: '🧹', name: '교실 환경미화원', salary: 28, slots: 2, desc: '일주일 2회 교실을 깨끗하게 관리해요' },
  { emoji: '🧹', name: '동도서도 환경미화원', salary: 22, slots: 1, desc: '교실 뒷편을 항상 깨끗하게 관리해요' },
  { emoji: '📏', name: '책상줄 관리', salary: 28, slots: 1, desc: '교실 환경미화원과 함께 책상줄을 맞춰요' },
  { emoji: '🧽', name: '칠판클리너', salary: 28, slots: 1, desc: '방과 후 칠판을 지우고 닦아요(방과 후 1회)' },
  { emoji: '🌬️', name: '공기질 관리원+에어컨+에너지 지킴이', salary: 22, slots: 1, desc: '미세먼지 상황을 확인하고 창문을 열고 닫아요(2교시마다)' },
  { emoji: '👟', name: '복도 신발장 환경미화원', salary: 22, slots: 2, desc: '일주일 2회 복도와 신발장을 정리해요' },
  { emoji: '♻️', name: '분리수거+쓰레기통 관리', salary: 22, slots: 2, desc: '2주에 1회 분리수거와 쓰레기통을 관리해요' },
  { emoji: '🧑‍💼', name: '선생님 비서', salary: 30, slots: 1, desc: '선생님 자리 정리와 교실을 나갈 때 TV·불 끄기를 도와요' },
  { emoji: '🎲', name: '보드게임 관리원', salary: 25, slots: 1, desc: '학급 도서관과 교구장을 정리해요' },
  { emoji: '📱', name: '패드 관리원', salary: 30, slots: 1, desc: '영어·미술 시간 전에 패드를 나눠 줘요' },
  { emoji: '⚽', name: '체육부장', salary: 22, slots: 1, desc: '체육시간에 준비운동을 해요' },
  { emoji: '🖨️', name: '프린트전담원', salary: 22, slots: 2, desc: '연구실에서 프린트를 가져와 나눠 줘요' },
  { emoji: '🪥', name: '양치관리원', salary: 24, slots: 2, desc: '매일 양치 상태를 확인해요' },
  { emoji: '📣', name: '급식 발표원', salary: 30, slots: 1, desc: '2·3교시 쉬는 시간에 급식 메뉴를 발표해요' },
  { emoji: '🗓️', name: '시간표 관리원', salary: 30, slots: 1, desc: '하교 전에 내일 시간표로 바꿔요' },
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

import { taxOfAmount } from './taxes';

/** 총 급여 = 기본 월급 + 직업 수당 */
export function grossPay(klass, job) {
  return Number(klass?.salary || 0) + Number(job?.salary || 0);
}

/** 세금(원 단위 내림)과 실수령액 */
export function taxOf(gross, taxRate) {
  const { tax, net } = taxOfAmount(gross, taxRate);
  return { tax, net };
}
