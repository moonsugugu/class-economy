# 🏦 우리 반 경제나라 (Class Economy)

초등학교 학급 경제 교육용 웹앱입니다. 학생들이 학급 화폐를 벌고(월급·보상), 쓰고(상점), 모으고(예금·적금), 투자하고(모의 주식), 꾸미는(캐릭터·마이룸) 경험을 통해 경제 개념을 배웁니다.

## 기술 스택
- **Frontend**: React 19 + Vite + Tailwind CSS 4 + React Router 7
- **인증**: Firebase Google Authentication (선생님 로그인 전용)
- **Backend/DB**: 홈서버 `api.moonsunezip.com` REST/WebSocket + PostgreSQL 17
- **주식**: 한국 20개 + 미국 20개 — `/api/quotes`가 Yahoo Finance의 실제 현재가를 프록시하고, 실패 시 기존 모의 시세로 안전하게 대체

## 시작하기

### 1. Firebase 프로젝트 준비 (선생님 Google 로그인용, 최초 1회)
1. [Firebase 콘솔](https://console.firebase.google.com)에서 새 프로젝트를 만듭니다.
2. **빌드 → Authentication → 로그인 방법**에서 **Google**을 사용 설정합니다.
3. **프로젝트 설정(⚙️) → 일반 → 내 앱 → 웹 앱 추가(</>)** 후 표시되는 `firebaseConfig` 값을 복사합니다.

Firestore는 운영 데이터 저장소로 사용하지 않습니다. 학급·학생·잔액·거래·주식 데이터는 홈서버 API를 통해 PostgreSQL에 저장됩니다.

### 2. 환경 변수 설정
```bash
# .env.example을 복사해 .env를 만들고 firebaseConfig 값을 채웁니다
cp .env.example .env
```

### 3. 실행
```bash
npm install
npm run dev
```

## 데이터 보존 및 운영 구조

- 선생님 로그인만 Firebase Google Authentication을 사용합니다.
- 브라우저는 PostgreSQL에 직접 접속하지 않고 `https://api.moonsunezip.com`의 REST/WebSocket API를 사용합니다.
- 기존 운영 데이터 경로는 `classes/{classId}/...`입니다. 기존 데이터가 있는 상태에서 `apps/class-economy/...`처럼 경로를 바꾸지 않습니다.
- 새 기능을 추가할 때도 기존 `classes/{classId}` 경로와 문서 ID를 유지하고, 데이터 이동이 필요하면 별도 마이그레이션과 복구 절차를 먼저 준비합니다.
- 학생 계정은 삭제 대신 보관(`archivedAt`)할 수 있으며, 보관 시 기존 자산·거래·하위 데이터를 삭제하지 않습니다.
- PostgreSQL API 변경이나 스키마 변경은 홈서버 백업 확인 후 진행합니다. 이 저장소에서는 홈서버에 원격 명령을 실행하지 않습니다.

## 사용 흐름
| 역할 | 방법 |
|---|---|
| 👩‍🏫 교사 | 구글 로그인 → 학급 만들기 → **학급 코드**를 학생에게 안내 |
| 🧑‍🎓 학생 | 가입 없이 **학급 코드 + 이름**으로 입장 (localStorage로 로그인 유지) |

### 교사 대시보드
- **학생**: 체크박스로 선택 → 월급 일괄 지급, 금액 입력 후 지급/차감(상벌점)
- **상점**: 실물 상품(쿠폰·간식 등) 등록 — 이모지/이미지 URL, 가격, 수량. 인라인 수정/삭제
- **알림**: 학생 구매 실시간 알림 → "지급 완료" 처리
- **주식**: "주식 시장 열기"로 40개 종목 생성, 실제 시세 불러오기 및 수동/자동(1분 59초) 시세 변동. 기본 하루 변동 횟수는 25회
- **버그 신고·건의함**: 담임 화면에서 개발자 이메일 작성 창을 열고, `xdaethx@naver.com` 계정은 전체 학급 수신함을 별도 확인
- **설정**: 화폐 단위(미소·달란트 등), 월급 금액, 예금/적금 이율, 주식 횟수, 용사 전투 횟수·승패 보상, 상점·내 공간·용사 아이템 물가(단위/퍼센트), 거래별 공동기금 세율

### 학생 화면 (하단 탭)
- **마이**: 현금 + 예금 + 적금 + 주식 평가액 = 총자산 한눈에
- **상점**: 잔액으로 구매 → 재고 차감 + 교사에게 알림 (PostgreSQL API 트랜잭션으로 품절/잔액 검증)
- **은행**: 예금(자유 입출금, 7일마다 이자 수령) / 적금(7·14·28일 약정, 높은 이율, 중도해지 시 원금만)
- **주식**: 실시간 시세·미니 차트·평가손익, 매수/매도 (트랜잭션 처리)
- **마이룸**: 캐릭터 3D 상세 미리보기, 가구 여러 개 구매·배치, 신규 오리·사람 캐릭터와 판다·돼지 애완동물, 모든 마이룸 아이템 50% 환불
- **용사키우기**: 소년·소녀 캐릭터와 착장 3D 미리보기, 부위별 20단계 장비(일반·희귀·엘리트·전설), 하루 3회 상점 새로고침, 전투력 비율로 100단계 몬스터에 도전

## 데이터 구조 (PostgreSQL 문서 API의 기존 경로)
```
classes/{classId}
  ├─ code, name, teacherUid, currency, salary, depositRate, savingsRate, tickLimit
  ├─ heroBattleLimit, heroWinReward, heroLoseReward — 용사 전투 설정
  ├─ priceInflationMode, priceInflationValue — 아이템 물가 상승 설정(기존 가격에 추가)
  ├─ taxRate, taxSalaryRate, taxShopRate, taxSeatRate, taxItemRate — 거래별 세율 설정
  ├─ taxStockBuyRate, taxStockSellRate — 주식 매수·매도 세율 설정
  ├─ taxLedger/pending — 아직 공동기금에 반영하지 않은 세금 누적 원장
  ├─ students/{studentId}   — name, cash, deposit, depositLastAt, avatar, inventory, room, holdings, rpg
  ├─ products/{productId}   — name, emoji, imageUrl, price, qty, subtotal, tax
  ├─ purchases/{purchaseId} — studentName, productName, price, status(pending|done)
  ├─ accounts/{accountId}   — 적금: studentId, amount, rate, days, startAt, status
  ├─ market/main            — stocks[], fx, tickCount, history/시세 상태
  └─ reports/{reportId}     — 학생 버그 신고·건의 및 선생님 답글
```

## 보안에 대한 참고
학생이 로그인 없이 참여하는 구조이므로 학급 하위 데이터는 열려 있는 **교실 신뢰 모델**입니다(학급 코드를 아는 사람만 접근한다고 가정). 학교 밖 공개 서비스로 확장하려면 학생용 익명 인증(Anonymous Auth) + 세분화된 규칙 도입을 권장합니다.

## 향후 확장 아이디어
- 메일 서버 연동: 현재 개발자 보내기 버튼은 기본 메일 앱의 `mailto:` 작성 창을 열며, 서버 자동 발송은 SMTP/메일 API 자격 증명이 필요
- 거래 내역 장부(용돈기입장), 세금·기부 시스템
- 학생 사진 업로드(Firebase Storage), PWA 홈화면 설치
