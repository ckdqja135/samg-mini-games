export interface CharacterDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  imageUrl: string;
  /** 표시용 기본 종횡비 (width / height) — 이미지 로드 전 placeholder 사이즈 계산에 사용 */
  aspectRatio: number;
  /** 캐릭터별 표시 크기 보정 배율 (기본 1) — 작거나 크게 보정하고 싶을 때 */
  displayScale?: number;
}

export const CHARACTER_SPRITES: CharacterDefinition[] = [
  {
    id: 'hachuping',
    name: '하츄핑',
    description: '사랑의 마음이 담긴 첫 번째 티니핑 — 모든 핑들의 리더 💗',
    color: '#FF8FB1',
    imageUrl: '/asset/hartping.png',
    aspectRatio: 1,
    displayScale: 1.15,
  },
  {
    id: 'dalkomping',
    name: '달콤핑',
    description: '달콤한 디저트와 딸기를 사랑하는 티니핑 🍓',
    color: '#FF6B6B',
    imageUrl: '/asset/sweetping.png',
    aspectRatio: 1,
  },
  {
    id: 'posilping',
    name: '포실핑',
    description: '구름처럼 포근한 마음을 나눠주는 티니핑 ☁️',
    color: '#C5B6E8',
    imageUrl: '/asset/posilping.png',
    aspectRatio: 1,
  },
  {
    id: 'saekomping',
    name: '새콤핑',
    description: '레몬처럼 톡톡 튀는 상큼함의 티니핑 🍋',
    color: '#82D9B5',
    imageUrl: '/asset/saecomping.png',
    aspectRatio: 1,
  },
  {
    id: 'shashaping',
    name: '샤샤핑',
    description: '별빛처럼 반짝이는 마음을 가진 티니핑 ✨',
    color: '#7DC4FF',
    imageUrl: '/asset/shashaping.png',
    aspectRatio: 1,
  },
];

export function getCharacter(id: string): CharacterDefinition | undefined {
  return CHARACTER_SPRITES.find((c) => c.id === id);
}
