'use client';

import { create } from 'zustand';
import { calculateScore } from '@/utils/scoreCalculator';

interface AddScoreOptions {
  isItemBonus?: boolean;
  breaksCombo?: boolean;
  /** 콤보/능력치/효과 메시지를 건드리지 않고 점수만 추가 (예: 거리 점수) */
  passive?: boolean;
}

interface GamePlayState {
  selectedCharacter: string;
  currentScore: number;
  comboCount: number;
  maxCombo: number;
  gameStartTime: number;
  abilityActivations: number;
  recentEffectMessages: string[];

  setCharacter: (id: string) => void;
  addScore: (baseScore: number, options?: AddScoreOptions) => void;
  resetCombo: () => void;
  resetGame: () => void;
}

export const useGamePlayStore = create<GamePlayState>((set, get) => ({
  selectedCharacter: '',
  currentScore: 0,
  comboCount: 0,
  maxCombo: 0,
  gameStartTime: 0,
  abilityActivations: 0,
  recentEffectMessages: [],

  setCharacter: (id) => set({ selectedCharacter: id }),

  addScore: (baseScore, options = {}) => {
    const state = get();
    if (!state.selectedCharacter) return;

    if (options.passive) {
      set({ currentScore: state.currentScore + Math.max(0, Math.floor(baseScore)) });
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
    }),
}));
