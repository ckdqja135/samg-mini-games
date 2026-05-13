/** 게임별 최소 플레이 시간 (ms) — 이보다 짧으면 비정상. */
export const PER_GAME_MIN_DURATION_MS: Record<string, number> = {
  'cloud-jump': 3_000,
  'balloon-ride': 3_000,
  'water-dodge': 3_000,
  'cake-catch': 3_000,
  'balloon-pop': 3_000,
  'star-ladder': 3_000,
  'fruit-river': 3_000,
};

/** 게임별 최대 플레이 시간 (ms) — 토큰 만료 외 추가 가드. */
export const PER_GAME_MAX_DURATION_MS: Record<string, number> = {
  'cloud-jump': 20 * 60_000,
  'balloon-ride': 20 * 60_000,
  'water-dodge': 20 * 60_000,
  'cake-catch': 20 * 60_000,
  'balloon-pop': 20 * 60_000,
  'star-ladder': 20 * 60_000,
  'fruit-river': 20 * 60_000,
};

/** 게임별 max 합리적 점수 (이상값 차단). 어드민 통계로 추후 보정. */
export const PER_GAME_MAX_SCORE: Record<string, number> = {
  'cloud-jump': 200_000,
  'balloon-ride': 200_000,
  'water-dodge': 100_000,
  'cake-catch': 80_000,
  'balloon-pop': 100_000,
  'star-ladder': 80_000,
  'fruit-river': 100_000,
};

/** 1초당 평균 최대 점수율 — durationMs와 score 비율로 부정 탐지 */
export const PER_GAME_MAX_SCORE_PER_SEC: Record<string, number> = {
  'cloud-jump': 800,
  'balloon-ride': 800,
  'water-dodge': 400,
  'cake-catch': 400,
  'balloon-pop': 500,
  'star-ladder': 400,
  'fruit-river': 500,
};

/** 분당 등록 횟수 제한 (간단한 in-memory rate limiter용) */
export const RATE_LIMIT_PER_MINUTE = 10;

/** in-memory rate limiter (단일 서버 인스턴스 가정. 운영에선 redis 권장) */
const submissions = new Map<string, number[]>();

export function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const arr = (submissions.get(userId) || []).filter((t) => now - t < window);
  if (arr.length >= RATE_LIMIT_PER_MINUTE) {
    submissions.set(userId, arr);
    return true;
  }
  arr.push(now);
  submissions.set(userId, arr);
  return false;
}
