import { CHARACTER_ABILITIES } from '@/data/characterAbilities';

export interface ScoreContext {
  baseScore: number;
  characterId: string;
  comboCount: number;
  gameTimeMs: number;
  isItemBonus?: boolean;
  isComboTriggered?: boolean;
}

export interface ScoreResult {
  finalScore: number;
  bonusScore: number;
  effectMessages: string[];
  abilityTriggered: boolean;
}

export function calculateScore(ctx: ScoreContext): ScoreResult {
  const ability = CHARACTER_ABILITIES[ctx.characterId];
  if (!ability) {
    return {
      finalScore: ctx.baseScore,
      bonusScore: 0,
      effectMessages: [],
      abilityTriggered: false,
    };
  }

  let finalScore = ctx.baseScore;
  let bonusScore = 0;
  const messages: string[] = [];
  let abilityTriggered = false;

  switch (ability.effect.type) {
    case 'score_multiplier': {
      const bonus = Math.floor(ctx.baseScore * (ability.effect.baseValue - 1));
      finalScore = ctx.baseScore + bonus;
      bonusScore = bonus;
      if (bonus > 0) {
        messages.push(`${ability.iconEmoji} +${bonus}`);
      }
      break;
    }

    case 'combo_bonus': {
      const interval = ability.effect.trigger?.every ?? 5;
      if (
        ctx.comboCount > 0 &&
        ctx.comboCount % interval === 0 &&
        ctx.isComboTriggered
      ) {
        bonusScore = ability.effect.baseValue;
        finalScore += bonusScore;
        abilityTriggered = true;
        messages.push(`${ability.iconEmoji} ${ctx.comboCount}콤보! +${bonusScore}`);
      }
      break;
    }

    case 'time_bonus': {
      const thresholdMs = (ability.effect.trigger?.threshold ?? 30) * 1000;
      if (ctx.gameTimeMs <= thresholdMs) {
        const bonus = Math.floor(ctx.baseScore * (ability.effect.baseValue - 1));
        finalScore = ctx.baseScore + bonus;
        bonusScore = bonus;
        if (bonus > 0) {
          abilityTriggered = true;
          messages.push(`${ability.iconEmoji} ×${ability.effect.baseValue} +${bonus}`);
        }
      }
      break;
    }

    case 'event_bonus': {
      if (ctx.isItemBonus) {
        const bonus = Math.floor(ctx.baseScore * (ability.effect.baseValue - 1));
        finalScore = ctx.baseScore + bonus;
        bonusScore = bonus;
        abilityTriggered = true;
        messages.push(`${ability.iconEmoji} 아이템 보너스! +${bonus}`);
      }
      break;
    }
  }

  return { finalScore, bonusScore, effectMessages: messages, abilityTriggered };
}
