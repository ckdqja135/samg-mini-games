/**
 * 게임 플레이 중 발생한 점수 이벤트 배열을 검증.
 * - 너무 적거나 너무 많은 이벤트
 * - duration 범위를 벗어난 타임스탬프
 * - 인터벌 분산이 0 (봇/매크로 의심)
 * - 신뢰할 수 없는 입력(untrusted) 비율 과다
 */

export interface ScoreEvent {
  /** 게임 시작 후 경과 ms */
  t: number;
  /** 'p' passive(거리 등), 's' score(능동 득점), 'b' bonus item */
  k: 'p' | 's' | 'b';
  /** addScore 호출 시 baseScore */
  v: number;
}

export interface ScoreEventValidationContext {
  gameId: string;
  durationMs: number;
  score: number;
  events: ScoreEvent[];
  untrustedInputs: number;
  totalInputs: number;
}

export interface ScoreEventValidationResult {
  ok: boolean;
  reason?: string;
}

/** 능동 이벤트(s/b) 1건당 최대 baseScore — 게임별 가장 큰 단가의 안전 마진 */
const MAX_EVENT_BASE_VALUE = 200;
/** untrustedInputs / totalInputs 가 이 값을 넘으면 거부 (50%). */
const UNTRUSTED_INPUT_RATIO_THRESHOLD = 0.5;
/** 비신뢰 입력 최소 카운트 — 이보다 적으면 비율 검증 스킵 (오탐 방지) */
const UNTRUSTED_INPUT_MIN_SAMPLES = 6;
/** 능동 이벤트 간격의 표준편차 최소 (ms) — 너무 일정하면 봇 */
const MIN_ACTIVE_INTERVAL_STDDEV_MS = 8;
/** 표준편차 검증을 시작할 능동 이벤트 최소 개수 */
const STDDEV_CHECK_MIN_EVENTS = 20;

export function validateScoreEvents(
  ctx: ScoreEventValidationContext
): ScoreEventValidationResult {
  const { durationMs, score, events, untrustedInputs, totalInputs } = ctx;

  if (!Array.isArray(events)) {
    return { ok: false, reason: 'events 가 배열이 아닙니다' };
  }

  // 점수가 있는데 이벤트가 0개 → 의심
  if (score > 0 && events.length === 0) {
    return { ok: false, reason: '점수 이벤트 누락' };
  }

  // 너무 많은 이벤트 (메모리 폭발 방어)
  if (events.length > 20_000) {
    return { ok: false, reason: '이벤트가 너무 많습니다' };
  }

  // 각 이벤트 형식 / 타임스탬프 / value 범위 확인
  let activeIntervals: number[] = [];
  let lastActiveT: number | null = null;
  let sumActiveBase = 0;
  for (const ev of events) {
    if (
      !ev ||
      typeof ev.t !== 'number' ||
      !Number.isFinite(ev.t) ||
      typeof ev.v !== 'number' ||
      !Number.isFinite(ev.v) ||
      (ev.k !== 'p' && ev.k !== 's' && ev.k !== 'b')
    ) {
      return { ok: false, reason: '이벤트 형식 오류' };
    }
    // 타임스탬프 범위: -50ms ~ duration + 500ms (클럭 드리프트 마진)
    if (ev.t < -50 || ev.t > durationMs + 500) {
      return { ok: false, reason: '이벤트 타임스탬프 범위 초과' };
    }
    if (ev.v < 0 || ev.v > MAX_EVENT_BASE_VALUE) {
      return { ok: false, reason: '이벤트 점수값 범위 초과' };
    }

    if (ev.k !== 'p') {
      sumActiveBase += ev.v;
      if (lastActiveT !== null) {
        const dt = ev.t - lastActiveT;
        if (dt >= 0) activeIntervals.push(dt);
      }
      lastActiveT = ev.t;
    }
  }

  // 능동 이벤트 base 합 × 합리적 배수보다 score가 크면 거부
  // (콤보/캐릭터 어빌리티로 점수가 부풀려질 수 있어 여유 배수 30 적용)
  if (sumActiveBase > 0) {
    const maxBoostFactor = 30;
    if (score > sumActiveBase * maxBoostFactor + 5_000) {
      return { ok: false, reason: '이벤트 대비 점수 과다' };
    }
  }

  // 능동 이벤트 인터벌 표준편차 — 봇은 거의 일정한 간격
  if (activeIntervals.length >= STDDEV_CHECK_MIN_EVENTS) {
    const mean =
      activeIntervals.reduce((s, x) => s + x, 0) / activeIntervals.length;
    const variance =
      activeIntervals.reduce((s, x) => s + (x - mean) ** 2, 0) /
      activeIntervals.length;
    const stddev = Math.sqrt(variance);
    if (stddev < MIN_ACTIVE_INTERVAL_STDDEV_MS) {
      return { ok: false, reason: '입력 패턴이 비정상적으로 일정합니다' };
    }
  }

  // 신뢰할 수 없는 입력 비율 — 익스텐션 합성 클릭 탐지
  if (
    totalInputs >= UNTRUSTED_INPUT_MIN_SAMPLES &&
    untrustedInputs / Math.max(1, totalInputs) >=
      UNTRUSTED_INPUT_RATIO_THRESHOLD
  ) {
    return { ok: false, reason: '비신뢰 입력 비율이 높습니다' };
  }

  return { ok: true };
}
