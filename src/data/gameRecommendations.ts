/**
 * 게임별 추천 캐릭터 — 게임 메카닉과 능력치 시너지에 따른 매핑.
 * - 콤보 위주(긴 콤보 유지): hachuping(5콤보) / saekomping(10콤보)
 * - 아이템 많음: shashaping(아이템 +50%)
 * - 초반 폭발형: posilping(초반 30초 점수 2배)
 * - 무난한 올라운더: dalkomping(전체 +10%)
 */
export const GAME_RECOMMENDATIONS: Record<
  string,
  { primary: string; reason: string }
> = {
  'cloud-jump': {
    primary: 'hachuping',
    reason: '구름을 연속으로 밟는 콤보형 — 사랑의 콤보(5콤보당 +50점)와 찰떡',
  },
  'balloon-ride': {
    primary: 'shashaping',
    reason: '과일/하트 수집이 핵심 — 아이템 +50% 보너스로 점수 폭발',
  },
  'water-dodge': {
    primary: 'saekomping',
    reason: '연속 회피로 콤보가 잘 쌓여요 — 10콤보당 +200점이 무서움',
  },
  'cake-catch': {
    primary: 'shashaping',
    reason: '디저트는 아이템! 아이템 +50%가 디저트마다 적용',
  },
  'balloon-pop': {
    primary: 'posilping',
    reason: '초반 30초 점수 2배 — 라운드 시작과 함께 풍선 펑펑',
  },
  'star-ladder': {
    primary: 'shashaping',
    reason: '별이 핵심 아이템 — 별 점수 +50% 보너스 받기',
  },
  'fruit-river': {
    primary: 'dalkomping',
    reason: '과일 + 거리 + 바위회피가 골고루 — 모든 점수 +10% 무난',
  },
};
