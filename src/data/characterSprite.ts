export const SPRITE_SHEET = {
  url: '/asset/teeniping.png',
  totalWidth: 2048,
  totalHeight: 2048,
};

export interface SpriteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  bounds: SpriteBounds;
}

export const CHARACTER_SPRITES: CharacterDefinition[] = [
  {
    id: 'hachuping',
    name: '하츄핑',
    description: '사랑을 전하는 핑크 핑 💗',
    color: '#FF8FB1',
    bounds: { x: 174, y: 680, width: 220, height: 560 },
  },
  {
    id: 'dalkomping',
    name: '달콤핑',
    description: '달콤한 마법의 빨간 핑 🍓',
    color: '#FF6B6B',
    bounds: { x: 494, y: 640, width: 320, height: 600 },
  },
  {
    id: 'posilping',
    name: '포실핑',
    description: '포근한 무지개빛 핑 🌈',
    color: '#C5B6E8',
    bounds: { x: 904, y: 720, width: 240, height: 520 },
  },
  {
    id: 'saekomping',
    name: '새콤핑',
    description: '상큼한 초록빛 핑 🍃',
    color: '#82D9B5',
    bounds: { x: 1253, y: 640, width: 280, height: 600 },
  },
  {
    id: 'shashaping',
    name: '샤샤핑',
    description: '아이스크림을 든 파란 핑 🍦',
    color: '#7DC4FF',
    bounds: { x: 1603, y: 590, width: 320, height: 650 },
  },
];

export function getCharacter(id: string): CharacterDefinition | undefined {
  return CHARACTER_SPRITES.find((c) => c.id === id);
}
