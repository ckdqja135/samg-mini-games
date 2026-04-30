export type TriggerType = 'combo' | 'time' | 'event' | 'passive';

export type AbilityEffectType =
  | 'score_multiplier'
  | 'combo_bonus'
  | 'time_bonus'
  | 'event_bonus';

export interface AbilityEffect {
  type: AbilityEffectType;
  baseValue: number;
  trigger?: {
    every?: number;
    threshold?: number;
  };
}

export interface CharacterAbility {
  id: string;
  name: string;
  description: string;
  shortDesc: string;
  iconEmoji: string;
  triggerType: TriggerType;
  effect: AbilityEffect;
}

export const CHARACTER_ABILITIES: Record<string, CharacterAbility> = {
  hachuping: {
    id: 'hachuping_love',
    name: '사랑의 콤보',
    description: '5콤보마다 보너스 점수 +50점',
    shortDesc: '5콤보당 +50점 💗',
    iconEmoji: '💗',
    triggerType: 'combo',
    effect: {
      type: 'combo_bonus',
      baseValue: 50,
      trigger: { every: 5 },
    },
  },

  dalkomping: {
    id: 'dalkomping_sweet',
    name: '달콤한 보너스',
    description: '획득하는 모든 점수 +10% (꾸준한 점수 부스트)',
    shortDesc: '모든 점수 +10% 🍓',
    iconEmoji: '🍓',
    triggerType: 'passive',
    effect: {
      type: 'score_multiplier',
      baseValue: 1.1,
    },
  },

  posilping: {
    id: 'posilping_safe',
    name: '포근한 안전망',
    description: '게임 시작 후 30초간 모든 점수 2배 (초반 폭발형)',
    shortDesc: '초반 30초 점수 2배 🌈',
    iconEmoji: '🌈',
    triggerType: 'time',
    effect: {
      type: 'time_bonus',
      baseValue: 2.0,
      trigger: { threshold: 30 },
    },
  },

  saekomping: {
    id: 'saekomping_fresh',
    name: '상큼한 폭발',
    description: '10콤보 달성 시마다 보너스 +200점 (고콤보형)',
    shortDesc: '10콤보당 +200점 🍃',
    iconEmoji: '🍃',
    triggerType: 'combo',
    effect: {
      type: 'combo_bonus',
      baseValue: 200,
      trigger: { every: 10 },
    },
  },

  shashaping: {
    id: 'shashaping_star',
    name: '반짝이는 별',
    description: '특수 아이템(별/구름 등) 획득 시 점수 +50% 추가',
    shortDesc: '아이템 점수 +50% ✨',
    iconEmoji: '✨',
    triggerType: 'event',
    effect: {
      type: 'event_bonus',
      baseValue: 1.5,
    },
  },
};

export function getTriggerTypeLabel(type: TriggerType): string {
  switch (type) {
    case 'combo':
      return '🔥 콤보형';
    case 'time':
      return '⏰ 시간형';
    case 'event':
      return '⭐ 이벤트형';
    case 'passive':
      return '🛡️ 패시브형';
  }
}
