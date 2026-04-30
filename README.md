# 마이핑 컴패니언 미니게임

마이핑 컴패니언 자사몰 연동 모바일 미니게임 (미니게임천국 스타일).

## 기술 스택

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + CSS Modules
- Zustand (상태 관리)
- Prisma + SQLite (개발) / PostgreSQL (운영)
- Framer Motion (애니메이션)
- HTML5 Canvas (게임 엔진)

## 시작하기

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env

# DB 마이그레이션 + 시드
npm run db:push
npx tsx prisma/seed.ts

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속.

## 인증

현재 Phase 1에서는 SMS 인증 없이 **전화번호 + 닉네임** 입력만으로 가입/로그인됩니다.
- 미가입 번호: 자동 회원가입
- 가입된 번호: 닉네임 갱신 후 로그인
- JWT 세션 쿠키 (30일)

## 진행 상태

- [x] Phase 1-1: Next.js 프로젝트 셋업
- [x] Phase 1-2: 디자인 시스템 + 글로벌 스타일
- [x] Phase 1-3: MobileFrame + 스플래시 화면
- [x] Phase 1-4: Prisma 스키마 + DB 클라이언트
- [x] Phase 1-5: 닉네임+전화번호 인증 (SMS 없이)
- [x] Phase 2-1: 스프라이트 메타데이터 + 능력치 정의
- [x] Phase 2-2: CharacterSprite (CSS) + CharacterRenderer (Canvas)
- [x] Phase 2-3: 콤보/점수 계산기 + gameStore
- [x] Phase 2-4: CharacterSelect 화면 (`/games/[gameId]`)
- [x] Phase 3-1: 랭킹 + 점수 API (사용자별 베스트 기준 TOP N)
- [x] Phase 3-2: GameCard + RankingList 컴포넌트
- [x] Phase 3-3: 게임 목록 화면 (TOP 5 + 내 최고기록 표시)
- [x] Phase 4-1: 구름 점프 타입/구름 생성기 (4종 + 별 아이템)
- [x] Phase 4-2: Canvas 게임 엔진 (점프 물리, 충돌, 카메라 스크롤, 좌우 래핑, 입력)
- [x] Phase 4-3: AbilityEffectOverlay + GameHUD
- [x] Phase 4-4: /games/[gameId]/play + /result placeholder
- [ ] Phase 4: 게임 플레이 (구름 점프)
- [ ] Phase 5: 결과 화면 + 점수 등록

## 폴더 구조

```
src/
├── app/                # Next.js App Router 페이지
│   ├── api/auth/       # 인증 API (login, me, logout)
│   ├── auth/login/     # 로그인 페이지
│   ├── games/          # 게임 선택 (placeholder)
│   ├── layout.tsx
│   ├── page.tsx        # 스플래시
│   └── globals.css
├── components/
│   ├── auth/           # PhoneInput
│   ├── layout/         # MobileFrame
│   └── ui/             # CuteButton, SparkleEffect
├── lib/
│   ├── auth.ts         # JWT 세션 + 전화번호 유틸
│   └── prisma.ts       # Prisma 싱글톤
├── store/
│   └── authStore.ts    # 인증 상태 (Zustand)
└── styles/
    ├── tokens.css
    ├── pixel-fonts.css
    └── character-animations.css
```
