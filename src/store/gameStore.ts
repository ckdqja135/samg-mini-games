'use client';

import { create } from 'zustand';
import { calculateScore } from '@/utils/scoreCalculator';

interface AddScoreOptions {
  isItemBonus?: boolean;
  breaksCombo?: boolean;
  /** 콤보/능력치/효과 메시지를 건드리지 않고 점수만 추가 (예: 거리 점수) */
  passive?: boolean;
}

export interface ScoreEvent {
  /** 게임 시작 후 경과 ms */
  t: number;
  /** 'p' passive, 's' score, 'b' bonus item */
  k: 'p' | 's' | 'b';
  /** baseScore */
  v: number;
}

interface GamePlayState {
  selectedCharacter: string;
  currentScore: number;
  comboCount: number;
  maxCombo: number;
  gameStartTime: number;
  abilityActivations: number;
  recentEffectMessages: string[];

  /** 서버에서 발급된 세션 토큰 (JWT) */
  sessionToken: string | null;
  /** 서버 DB의 GameSession.id */
  sessionId: string | null;
  /** 세션 생성 시 setState 된 startedAt — 클라 기준 ms (참고용) */
  sessionStartedClientMs: number;
  /** 점수 이벤트 로그 — 서버 검증용 */
  scoreEvents: ScoreEvent[];
  /** isTrusted=false 인 입력 카운트 */
  untrustedInputs: number;
  /** 전체 입력 카운트 */
  totalInputs: number;

  setCharacter: (id: string) => void;
  addScore: (baseScore: number, options?: AddScoreOptions) => void;
  resetCombo: () => void;
  resetGame: () => void;
  /** 서버에 세션 시작 요청. 실패하면 sessionToken null 유지. */
  startSession: (gameId: string, characterId: string) => Promise<void>;
  /** 입력 카운트 증가 (PlayClient에서 호출) */
  recordInput: (isTrusted: boolean) => void;
}

const MAX_EVENTS_IN_STORE = 15_000;

export const useGamePlayStore = create<GamePlayState>((set, get) => ({
  selectedCharacter: '',
  currentScore: 0,
  comboCount: 0,
  maxCombo: 0,
  gameStartTime: 0,
  abilityActivations: 0,
  recentEffectMessages: [],

  sessionToken: null,
  sessionId: null,
  sessionStartedClientMs: 0,
  scoreEvents: [],
  untrustedInputs: 0,
  totalInputs: 0,

  setCharacter: (id) => set({ selectedCharacter: id }),

  addScore: (baseScore, options = {}) => {
    const state = get();
    if (!state.selectedCharacter) return;

    // 이벤트 로그 (서버 검증용) — passive/item/score 구분
    const startMs = state.gameStartTime || 0;
    const t = Math.max(0, performance.now() - startMs);
    const kind: ScoreEvent['k'] = options.passive
      ? 'p'
      : options.isItemBonus
      ? 'b'
      : 's';
    if (state.scoreEvents.length < MAX_EVENTS_IN_STORE) {
      // mutate in place via push then set new array ref — 효율
      const next = state.scoreEvents.slice();
      next.push({
        t: Math.round(t),
        k: kind,
        v: Math.max(0, Math.min(200, Math.floor(baseScore))),
      });
      set({ scoreEvents: next });
    }

    if (options.passive) {
      set({
        currentScore: state.currentScore + Math.max(0, Math.floor(baseScore)),
      });
      return;
    }

    const now = performance.now();
    const newComboCount = options.breaksCombo ? 0 : state.comboCount + 1;

    const result = calculateScore({
      baseScore,
      characterId: state.selectedCharacter,
      comboCount: newComboCount,
      gameTimeMs: now - state.gameStartTime,
      isItemBonus: options.isItemBonus,
      isComboTriggered: !options.breaksCombo,
    });

    set({
      currentScore: state.currentScore + result.finalScore,
      comboCount: newComboCount,
      maxCombo: Math.max(state.maxCombo, newComboCount),
      abilityActivations:
        state.abilityActivations + (result.abilityTriggered ? 1 : 0),
      recentEffectMessages: [
        ...state.recentEffectMessages,
        ...result.effectMessages,
      ],
    });

    if (result.effectMessages.length > 0) {
      setTimeout(() => {
        set((s) => ({
          recentEffectMessages: s.recentEffectMessages.filter(
            (m) => !result.effectMessages.includes(m)
          ),
        }));
      }, 1500);
    }
  },

  resetCombo: () => set({ comboCount: 0 }),

  resetGame: () =>
    set({
      currentScore: 0,
      comboCount: 0,
      maxCombo: 0,
      gameStartTime: performance.now(),
      abilityActivations: 0,
      recentEffectMessages: [],
      // 세션 관련은 startSession에서 갱신 — 여기선 입력/이벤트 카운트만 초기화
      scoreEvents: [],
      untrustedInputs: 0,
      totalInputs: 0,
    }),

  startSession: async (gameId, characterId) => {
    // 이전 세션 클리어 — fetch 시작 전에 즉시 비워서 잔여 토큰 사용 차단
    set({
      sessionToken: null,
      sessionId: null,
      sessionStartedClientMs: 0,
      scoreEvents: [],
      untrustedInputs: 0,
      totalInputs: 0,
    });
    try {
      const res = await fetch(`/api/games/${gameId}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      });
      if (!res.ok) return;
      const data: {
        sessionId: string;
        sessionToken: string;
        startedAt: string;
      } = await res.json();
      set({
        sessionToken: data.sessionToken,
        sessionId: data.sessionId,
        sessionStartedClientMs: performance.now(),
      });
    } catch {
      // 네트워크 실패 — 토큰 없이 진행. 결과 등록 시 401로 거부됨.
    }
  },

  recordInput: (isTrusted) => {
    set((s) => ({
      totalInputs: s.totalInputs + 1,
      untrustedInputs: s.untrustedInputs + (isTrusted ? 0 : 1),
    }));
  },
}));
