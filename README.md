# 🏦 우리 반 경제나라 (Class Economy)

초등학교 학급 경제 교육용 웹앱입니다. 학생들이 학급 화폐를 벌고(월급·보상), 쓰고(상점), 모으고(예금·적금), 투자하고(모의 주식), 꾸미는(캐릭터·마이룸) 경험을 통해 경제 개념을 배웁니다.

## 기술 스택
- **Frontend**: React 19 + Vite + Tailwind CSS 4 + React Router 7
- **Backend/DB**: Firebase (Google Authentication + Cloud Firestore 실시간 동기화)
- **주식**: 한국 대표주 10개 + 미국 대표주 10개 — API 키 없이 쓸 수 있는 **모의 시세 시뮬레이션** (교사 대시보드에서 변동 → Firestore를 통해 모든 학생 화면에 실시간 반영)

## 시작하기

### 1. Firebase 프로젝트 준비 (최초 1회, 약 5분)
1. [Firebase 콘솔](https://console.firebase.google.com)에서 새 프로젝트를 만듭니다.
2. **빌드 → Authentication → 로그인 방법**에서 **Google**을 사용 설정합니다.
3. **빌드 → Firestore Database**를 생성합니다. (위치는 asia-northeast3 서울 추천)
4. Firestore **규칙** 탭에 이 저장소의 `firestore.rules` 내용을 붙여넣고 게시합니다.
5. **프로젝트 설정(⚙️) → 일반 → 내 앱 → 웹 앱 추가(</>)** 후 표시되는 `firebaseConfig` 값을 복사합니다.

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

## 사용 흐름
| 역할 | 방법 |
|---|---|
| 👩‍🏫 교사 | 구글 로그인 → 학급 만들기 → **학급 코드**를 학생에게 안내 |
| 🧑‍🎓 학생 | 가입 없이 **학급 코드 + 이름**으로 입장 (localStorage로 로그인 유지) |

### 교사 대시보드
- **학생**: 체크박스로 선택 → 월급 일괄 지급, 금액 입력 후 지급/차감(상벌점)
- **상점**: 실물 상품(쿠폰·간식 등) 등록 — 이모지/이미지 URL, 가격, 수량. 인라인 수정/삭제
- **알림**: 학생 구매 실시간 알림 → "지급 완료" 처리
- **주식**: "주식 시장 열기"로 20개 종목 생성, 수동/자동(45초) 시세 변동
- **설정**: 화폐 단위(미소·달란트 등), 월급 금액, 예금/적금 이율

### 학생 화면 (하단 탭)
- **마이**: 현금 + 예금 + 적금 + 주식 평가액 = 총자산 한눈에
- **상점**: 잔액으로 구매 → 재고 차감 + 교사에게 알림 (Firestore 트랜잭션으로 품절/잔액 검증)
- **은행**: 예금(자유 입출금, 7일마다 이자 수령) / 적금(7·14·28일 약정, 높은 이율, 중도해지 시 원금만)
- **주식**: 실시간 시세·미니 차트·평가손익, 매수/매도 (트랜잭션 처리)
- **마이룸**: 캐릭터 선택(무료) + 모자/얼굴/액세서리 착용 + 가구 구매 후 8×5 격자 배치 + **Canvas 인증샷 PNG 저장**

## 데이터 구조 (Firestore)
```
classes/{classId}
  ├─ code, name, teacherUid, currency, salary, depositRate, savingsRate
  ├─ students/{studentId}   — name, cash, deposit, depositLastAt, avatar, inventory, room, holdings
  ├─ products/{productId}   — name, emoji, imageUrl, price, qty
  ├─ purchases/{purchaseId} — studentName, productName, price, status(pending|done)
  ├─ accounts/{accountId}   — 적금: studentId, amount, rate, days, startAt, status
  └─ stocks/{symbol}        — name, market(KR|US), price, prevClose, history[]
```

## 보안에 대한 참고
학생이 로그인 없이 참여하는 구조이므로 학급 하위 데이터는 열려 있는 **교실 신뢰 모델**입니다(학급 코드를 아는 사람만 접근한다고 가정). 학교 밖 공개 서비스로 확장하려면 학생용 익명 인증(Anonymous Auth) + 세분화된 규칙 도입을 권장합니다.

## 향후 확장 아이디어
- Yahoo Finance 등 실제 시세 연동(서버리스 함수 프록시 필요)
- 거래 내역 장부(용돈기입장), 세금·기부 시스템
- 학생 사진 업로드(Firebase Storage), PWA 홈화면 설치
