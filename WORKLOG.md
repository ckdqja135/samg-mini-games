# Worklog

다른 디바이스에서 작업 이어갈 때 참고용. 최신 항목을 위에.

---

## 2026-05-15 — [기획안] 위클리 TOP5 구매권 (게임 점수 × 자사몰 매출 연결)

> 구현 아님. 다른 디바이스/회의에서 설명할 수 있게 정리한 기획안.

### 한 줄 요약
**매주 한정 SKU 1개. 일주일 누적 점수 TOP5에게 등수별 차등 가격 구매권. 본인 1결제 한정.**

게임 = 자사몰 매출 엔진. 점수/등수가 그 자리에서 "구매권"이라는 즉시 가치로 환산되는 구조.

### 왜 이 형태인가 (입찰형 경매 대비)
- 입찰형은 "내 점수 날아갈 수도" 진입장벽 → 헤비유저만 참여
- TOP5 구매권은 **점수 소모 0, 순수 등수 = 자격** → 모든 사용자 평등 참여
- 점수는 그대로 누적 → "점수 = 자사몰 화폐"(별도 기획) 와 충돌 없이 결합 가능

### 등수별 가격 (계단형이 핵심)

| 등수 | 가격 예시 (정가 ₩50,000) |
|---|---|
| 1등 | **₩0 — 무료 증정** |
| 2등 | 80% 할인 — ₩10,000 |
| 3등 | 70% 할인 — ₩15,000 |
| 4등 | 60% 할인 — ₩20,000 |
| 5등 | 50% 할인 — ₩25,000 |

**플랫이 아니라 계단형**으로 두는 이유:
- 1등은 거의 공짜 → "한 번이라도 1등" 평생 목표 생성
- 2~4등이 가장 빡세게 함 — "한 등 차이 = ₩5,000 차이"가 산수로 보임
- 5등도 절반 가격 → 만족스러운 보상 → 인증 콘텐츠 자발 생산
- 6~10등이 cutoff line에서 미친 듯이 push → **진짜 매출 기여는 여기서 발생**

### 운영 룰 (단순화 우선)
1. **집계 단위**: 주 단위 누적 점수. 월요일 00:00 KST ~ 일요일 24:00 KST.
2. **점수 풀**: 종합(7개 게임 합산) 1개로 시작. 게임별 분리는 1개월 후 데이터 보고 결정.
3. **동점 처리**: 먼저 그 점수에 도달한 사람 우선 (`Score.playedAt` 기준).
4. **구매권 유효기간**: 마감 후 7일. 미사용 시 소멸 (6등 양도 X — 복잡도 폭증).
5. **결제 횟수**: 본인 1회 한정. 어뷰징 방어는 이미 깔린 세션 토큰으로 충분.
6. **상품 카테고리**: 신상품 / 한정 컬러 / 협업 굿즈. 매출 잠식 적고 화제성 큰 SKU.
7. **연속 1등 방지(검토 항목)**: 같은 사람 5주 연속 1등 시 김 빠짐. "시즌 내 1등 1회 한정" 또는 "1등 경험자 다음 주 -10% 점수 핸디캡" 검토.

### 마케팅적 강점

1. **매주 PR 콘텐츠 자동 생성**
   - 5명 인증샷이 매주 발생. 1등 무료 인증은 본능적으로 자랑함.
   - 콘텐츠 마케팅 비용 0원, UGC 주 5건 안정 생산.

2. **카운트다운 푸시 후크 강력**
   - 토요일 저녁: "마감까지 30시간. 현재 6위, TOP5까지 +1,250점"
   - 일요일 22시: "마감 2시간 전. 5위와 1점 차"
   - 본인 등수 + 카운트다운 푸시 클릭률 압도적.

3. **메인 상시 띠 배너 = 매 방문마다 게임 명분 제공**
   ```
   🏆 이번 주 TOP5 가격 · ₩50,000 → 1등 ₩0
   현재 회원님 8위 · TOP5까지 +1,250점 · D-3 12:34:21
   ```

4. **주간 사이클이 PMF에 최적**
   - 시즌 패스(4주)보다 짧음. "한 번 도전해볼만한 길이"
   - 1주차에 망해도 다음 주 리셋 → 포기 안 함

5. **상품 운영 관점**: 시즌 클리어 상품을 경매로 빼면 **할인 마케팅 + 게임 이벤트 + 재고관리** 동시 처리.

### 점수 화폐화(별도 기획)와의 결합

이 시스템 단독으로도 강하지만, **점수 잔액은 소모되지 않음**이 결정적:
- 한 판 플레이가 두 가치를 동시 적립:
  - 자사몰에서 쓸 점수 잔액 (누적, 영구)
  - 이번 주 TOP5 진입 점수 (주간, 리셋)
- 모든 점수가 손해 없이 가치를 가짐 → 진짜 락인 구조.

### 코드베이스 기준 작업량 (1주 추정)

- 신규 테이블:
  - `WeeklyAuction` (주차 / 상품 / 시작·종료시각 / 산정완료 플래그)
  - `WeeklyAuctionResult` (주차 / userId / rank / discountRate / redeemedAt)
- 주간 점수 집계 쿼리 (`Score(gameId, score)` 인덱스 활용, 가벼움)
- 일요일 24:00 cron — TOP5 산정 + 구매권 발급
- 메인 화면 띠 배너 컴포넌트 (실시간 등수/잔여시간)
- 구매권 결제 페이지 — **자사몰 결제 API 연동이 진짜 변수**
- 자사몰 API 연동 불가 상태에서는 "구매권 코드 발급 → 자사몰 수동 입력" 임시 운영 가능

### 결정 필요한 항목 (출시 전)

1. **첫 주 상품**: 재고 충분 + 정가 ₩30,000~₩80,000 + 한정/협업 조건. 너무 비싸면 1등 외 매력 X, 너무 싸면 화제성 X.
2. **자사몰 결제 API 연동 가능 여부** — 일정의 가장 큰 변수.
3. **연속 1등 핸디캡 룰 적용 여부**.
4. **종합 점수 vs 게임별 점수** — 첫 출시는 종합 1개 권장.

### 알려진 리스크

- **점수 어뷰징 = 구매권 어뷰징**: 어뷰징 방어 1·2단계 깔려 있어 큰 리스크는 아니나, 등수 산정 로직 한 번 더 감사 필요.
- **되팔이**: 본인 계정 결제만 허용으로 차단. 양도/선물 기능 절대 추가 X.
- **재고 부족 시 신뢰 붕괴**: 매주 최소 5개 재고 보장. 1주 5SKU 운영 부담은 낮음.

---

## 2026-05-14 — 점수 어뷰징 차단 1+2단계 구현

### 무엇을 했나
1. **세션 토큰 기반 점수 등록** (HMAC JWT, 15분 만료)
   - 게임 시작 시 `POST /api/games/[gameId]/session` → 토큰 발급
   - 점수 등록 시 토큰 + 서버 측 duration 강제 + 재제출 차단(`Score.sessionId @unique`)
2. **점수 이벤트 로그 검증**
   - 게임 중 `addScore` 호출이 자동으로 `scoreEvents[]`에 push
   - 서버에서 인터벌 표준편차(<8ms 거부), baseScore 합 대비 점수(×30+5000 초과 거부) 검사
3. **`isTrusted` 입력 추적**
   - `PlayClient`에서 `pointerdown/keydown` capture phase로 카운트
   - untrusted ≥ 50% 거부 (익스텐션 합성 클릭 탐지)

### 추가/수정 파일
- 신규: `src/lib/gameSession.ts`, `src/lib/scoreEventValidation.ts`,
  `src/app/api/games/[gameId]/session/route.ts`,
  `prisma/migrations/20260513120000_add_game_session/migration.sql`
- 수정: `prisma/schema.prisma`(GameSession 모델 + Score.sessionId),
  `src/app/api/scores/route.ts`(토큰·이벤트 검증),
  `src/store/gameStore.ts`(startSession/scoreEvents/recordInput),
  `src/components/game/*Game.tsx` × 7(startSession 호출 + 결과 페이로드),
  `src/app/games/[gameId]/play/PlayClient.tsx`(isTrusted 트래커),
  `src/app/games/[gameId]/result/ResultClient.tsx`(새 POST 페이로드),
  `src/types/{score,game,cloudJump}.ts`, `src/lib/scoreLimits.ts`

### 다른 디바이스에서 이어가기 — 배포 전 체크리스트
1. **환경변수 추가** — `.env`(.env.local)에:
   ```
   GAME_SESSION_SECRET=<32자 이상 랜덤 문자열>
   ```
   미설정 시 `JWT_SECRET`을 폴백으로 사용하지만, 운영에선 반드시 분리.
2. **DB 마이그레이션 적용**
   - 운영: `npx prisma migrate deploy`
   - 로컬 dev: `npx prisma migrate dev` (이미 마이그레이션 파일은 생성돼 있음)
3. **`npx prisma generate`** — 새 디바이스에서 pull 받으면 가장 먼저.
4. **dev 환경에서 한 판 플레이** — 점수 등록 되는지, 어드민 페이지에서 score row의 `sessionId`가
   채워지는지 확인.

### 임계값 (필요 시 튜닝)
- `src/lib/scoreEventValidation.ts`
  - `MIN_ACTIVE_INTERVAL_STDDEV_MS = 8` — 능동 입력 인터벌 표준편차 하한
  - `UNTRUSTED_INPUT_RATIO_THRESHOLD = 0.5` — untrusted 입력 비율 한계
  - `MAX_EVENT_BASE_VALUE = 200` — 이벤트 1건의 baseScore 상한
- `src/lib/scoreLimits.ts`
  - `PER_GAME_MIN_DURATION_MS` — 게임별 최소 플레이 시간(현재 모두 3초)
- `src/lib/gameSession.ts`
  - `GAME_SESSION_MAX_DURATION_SEC = 60 * 15` — 토큰 만료(15분)

### 다음 단계 (아직 안 함)
- **3단계 — 어드민 이상치 자동 플래그**
  - 상위 1% 점수는 `pending` 상태로 → 어드민이 review 후 노출
  - `Score` 테이블에 `flagged` / `reviewStatus` 컬럼 추가 필요
  - 운영 데이터 쌓인 뒤 작업하는 게 좋음
- **4단계 — 개발자도구 단축키 차단(가벼운 허들)**
  - PlayClient에서 F12, Ctrl+Shift+I/J/C, 우클릭 막기
  - 점수 계산 모듈만 `javascript-obfuscator` 적용 검토

### 알려진 한계
- 기존 sessionStorage(`samg:lastResult:*`)에 sessionToken이 없는 사용자는 등록 실패
  → ResultClient에서 "세션이 만료되어..." 메시지 노출. 한 판 다시 하면 정상.
- `scoreCalculator.ts`의 콤보/캐릭터 어빌리티 보너스가 매우 큰 경우, 검증 배수 30이 부족할 수
  있음 — dev 플레이에서 오탐 나오면 배수 상향.
