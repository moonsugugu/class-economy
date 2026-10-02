# 🏦 우리 반 경제나라 (Class Economy)

초등학교 학급 경제 교육용 웹앱입니다. 학생들이 학급 화폐를 벌고(월급·보상), 쓰고(상점), 모으고(예금·적금), 투자하고(모의 주식), 꾸미는(캐릭터·마이룸) 경험을 통해 경제 개념을 배웁니다.

## 기술 스택
- **Frontend**: React 19 + Vite + Tailwind CSS 4 + React Router 7
- **인증**: Firebase Google Authentication (선생님 로그인 전용)
- **Backend/DB**: 홈서버 `api.moonsunezip.com` REST/WebSocket + PostgreSQL 17
- **주식**: 한국 20개 + 미국 20개 — 앱 서버의 `/api/quotes`가 Yahoo Finance의 실제 현재가를 프록시하고, 실패 시 기존 모의 시세로 안전하게 대체. 매수 세금은 0%, 매도 이익 세금은 5%

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
- **주식**: "주식 시장 열기"로 40개 종목 생성, 실제 시세 불러오기 및 수동/자동(1분 59초) 시세 변동. 하루 변동 횟수는 최대 25회
- **버그 신고·건의함**: 담임 화면에서 개발자 이메일 작성 창을 열고, `xdaethx@naver.com` 계정은 전체 학급 수신함을 별도 확인
- **설정**: 화폐 단위(미소·달란트 등), 월급 금액, 예금/적금 이율, 주식 횟수, 용사 전투 횟수·승패 보상, 상점·내 공간·용사 아이템 물가(단위/퍼센트), 거래별 공동기금 세율

### 학생 화면 (하단 탭)
- **마이**: 현금 + 예금 + 적금 + 주식 평가액 = 총자산 한눈에
- **상점**: 잔액으로 구매 → 재고 차감 + 교사에게 알림 (PostgreSQL API 트랜잭션으로 품절/잔액 검증)
- **은행**: 예금(자유 입출금, 7일마다 이자 수령) / 적금(7·14·28일 약정, 높은 이율, 중도해지 시 원금만)
- **주식**: 실제 시세·미니 차트·평가손익, 매수/매도 (매수 세금 없음, 매도 이익의 5% 세금)
- **마이룸**: 캐릭터 3D 상세 미리보기, 가구 여러 개 구매·배치, 신규 오리·사람 캐릭터와 판다·돼지 애완동물, 모든 마이룸 아이템 50% 환불
- **용사키우기**: 소년·소녀 캐릭터와 착장 3D 미리보기, 엘리트·전설 장비 발광 효과, 부위별 20단계 장비와 펫, 100종 몬스터·10단계마다 HP 보스, 전투력 비율 전투. 용사 이름·보스 칭호, 기본 도전 횟수 소진 후 비용이 1씩 오르는 추가 도전 지원
- **친구 대결**: 전투력 순위의 위 2명·아래 2명 중 선택해 전투력 비율로 대결. 하루 기본 10회, 승리 2학급화폐, 패배 0, 추가 대결 2학급화폐
- **프로필 상점**: 마이 화면의 내 프로필을 누르면 캐릭터·모자·표정·장식을 구매·장착·50% 환불

## 데이터 구조 (PostgreSQL 문서 API의 기존 경로)
```
classes/{classId}
  ├─ code, name, teacherUid, currency, salary, depositRate, savingsRate, tickLimit
  ├─ heroBattleLimit, heroWinReward, heroLoseReward — 용사 전투 설정
  ├─ priceInflationMode, priceInflationValue — 아이템 물가 상승 설정(기존 가격에 추가)
  ├─ taxRate, taxSalaryRate, taxShopRate, taxSeatRate, taxItemRate — 거래별 세율 설정
  ├─ taxStockBuyRate, taxStockSellRate — 호환용 필드(현재 매수 0%, 매도 이익 5% 고정)
  ├─ taxLedger/pending — 아직 공동기금에 반영하지 않은 세금 누적 원장
  ├─ students/{studentId}   — name, cash, deposit, depositLastAt, avatar, profileOwned, inventory, room, holdings, rpg, heroDuel
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

<!-- HOMESERVER:START -->
## 🏠 홈서버 배포 정보 (moonsunezip 노트북 서버)

> **다른 세션·다른 AI 에서 이 앱을 고치기 전에 이 섹션을 먼저 읽으세요.**
> 서버 관리자가 관리하는 섹션입니다(마지막 갱신 2026-09-27). 앱 설명은 위쪽 본문을 보세요.

### 우리 반 경제나라 — 운영 정보

| 항목 | 값 |
|---|---|
| 주소 | https://economy.moonsunezip.com |
| 서버 포트 | 3002 (PM2 이름 `economy`) |
| 배포 브랜치 | `main` |
| 배포 방식 | 범용 배포 → `npm ci` → `npm run build` → `dist/` 정적 제공 |
| 서버 위치 | `C:\homeserver\apps\class-economy` |

### 이 앱만의 주의점

- **돈·잔액·거래내역을 다루는 앱입니다.** 서버 보관 정책상 `economy/` 경로 데이터는 **2년(730일)** 보관합니다. 절대 임시 테이블(UNLOGGED)에 넣지 마세요.
- 데이터는 `https://api.moonsunezip.com/v1/documents` 를 씁니다. 여러 학생이 동시에 쓰는 값(잔액 등)은 한 문서에 몰지 말고 나누거나 트랜잭션(`commit`)으로 처리하세요. 동시 수정은 버전 충돌(409)로 거부됩니다.
- 서버의 `.env` 에는 Firebase 웹 설정(`VITE_FB_*`)이 들어 있고, 코드에도 Firebase 참조가 남아 있습니다. `VITE_` 로 시작하는 값은 빌드 때 화면 코드에 **그대로 박혀 누구나 볼 수 있습니다.** 비밀로 지켜야 하는 값은 `VITE_` 로 넣지 마세요.

### 이 서버는 어떤 곳인가

- **집 노트북 1대**(Lenovo IdeaPad L340 · i5-9300H 4코어 8스레드 · RAM 8GB · Windows 11)가 moonsunezip.com 의 앱 전부를 서비스합니다.
- 모든 앱은 `127.0.0.1` 에만 열리고, 외부 접속은 **Cloudflare Tunnel** 이 전담합니다(집 IP·포트 비노출, HTTPS 자동).
- 프로세스는 **PM2** 가 관리하고, **5분마다 감시(watchdog)** 가 죽은 앱을 되살립니다.
- 데이터 저장은 **PostgreSQL 17 + 공용 API(https://api.moonsunezip.com)** 입니다. Firebase·PocketBase 는 새로 쓰지 않습니다.
- 여유 자원: RAM 여유 약 0.8GB(넉넉하지 않음), 집 인터넷 업로드 약 170Mbps(Wi-Fi).

### 배포 흐름 — 반드시 이해하고 수정하세요

1. 배포 브랜치에 push 하면 서버가 **3분 안에** 감지합니다.
2. 서버는 `git reset --hard origin/<브랜치>` 로 코드를 **통째로 덮어쓰고** → `npm ci` → `npm run build` → PM2 재시작 순서로 배포합니다.
3. 빌드나 헬스체크가 실패하면 **이전 버전으로 자동 롤백**되고 사이트는 이전 상태로 유지됩니다.

따라서:
- **서버 폴더를 직접 고치지 마세요.** 다음 배포 때 사라지거나, "커밋 안 된 수정"으로 판단돼 배포가 멈춥니다.
- `package-lock.json` 을 반드시 커밋하세요(`npm ci` 는 lock 파일이 없으면 실패합니다).
- **게임 서버가 있는 앱은 배포 = 서버 재시작 = 진행 중인 방이 전부 사라짐** 입니다. push 하기 전에 서버 관리자에게 물어보세요(`.md` 문서만 바꾼 push는 재시작 없음).

### 실시간·게임 코드를 짤 때 지킬 것 (실제로 겪은 문제들)

| 규칙 | 이유 |
|---|---|
| 서버는 `HOST`, `PORT` 환경변수를 읽고 기본값을 `127.0.0.1` 로 | 주소를 `0.0.0.0` 으로 코드에 고정하면 서버 설정으로 바꿀 수 없음 |
| **IP 당 제한을 걸지 마세요** | 학교는 전교생이 **공인 IP 하나**로 나갑니다. 윷놀이의 "IP당 방 6개" 제한이 학교 전체를 막았습니다 |
| 방 상태 전송 시각·타이머는 **방마다 따로** | 전역 변수 하나로 두면 한 반의 활동이 다른 반 갱신을 밀어냅니다(줄다리기에서 최장 4초 멈춤) |
| 큰 상태를 자주 보내면 WebSocket 압축(`perMessageDeflate`) | 줄다리기 20개 반 기준 161Mbps → 3Mbps |
| 끊긴 학생이 **60초 안에 같은 자리로 재접속**할 수 있게 | 교실 와이파이는 자주 끊깁니다. 빈 방도 60초는 유지하세요 |
| 요청 처리 중 동기 파일 I/O·느린 OS 호출 금지 | Windows 에서 `os.networkInterfaces()` 1회 25ms → 30명 방에서 서버가 멈췄습니다 |
| 요청마다 목록 전체를 훑는 코드 금지 | 사용자가 늘수록 느려집니다(backend 처리량이 4분의 1이던 원인) |
| 비밀값(키·비밀번호)은 저장소에 넣지 않기 | 서버의 비밀값은 `C:\homeserver\secrets` 에 따로 있습니다 |

**부하 목표: 한 학교 20개 반 동시 사용(약 600명).** 전국 배포라 한글날처럼 특정 날에 몰립니다.

### 공용 서버 주소

| 용도 | 주소 |
|---|---|
| 데이터 API (PostgreSQL) | `https://api.moonsunezip.com` — `/v1/documents/doc`·`/query`·`/commit`, `/health` |
| 데이터 실시간 알림 (서버→화면 단방향) | `wss://api.moonsunezip.com/v1/realtime?room=방코드` · `/v1/documents/realtime?scope=범위` |
| 공용 게임 서버 (메모리, 양방향) | `wss://game.moonsunezip.com/v1/game?room=방코드&game=게임이름&name=이름` |

새 주소(서브도메인)나 새 포트가 필요하면 서버 쪽에서 Cloudflare 설정과 PM2 등록을 해야 합니다. 코드만 올려서는 열리지 않습니다.

<!-- HOMESERVER:END -->
