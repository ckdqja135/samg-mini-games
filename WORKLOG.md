# Worklog

다른 디바이스에서 작업 이어갈 때 참고용. 최신 항목을 위에.

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
