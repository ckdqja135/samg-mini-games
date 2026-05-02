import type { Cloud, CloudType, Fruit, FruitType } from '@/types/cloudJump';

export const CLOUD_JUMP_CONFIG = {
  GRAVITY: 0.28,
  JUMP_POWER: -9.5,
  TRAMPOLINE_POWER: -15,
  MOVE_SPEED: 2.4,
  CANVAS_WIDTH: 375,
  CANVAS_HEIGHT: 700,
  PLAYER_HEIGHT: 64,
  CLOUD_WIDTH: 70,
  CLOUD_HEIGHT: 22,
  CLOUD_COUNT: 12,
  MIN_VERTICAL_GAP: 70,
  MAX_VERTICAL_GAP: 110,
  MOVING_CLOUD_SPEED: 1.0,
  FRUIT_SIZE: 28,
  FRUIT_SPAWN_CHANCE: 0.35,
};

const CLOUD_COLORS: Record<CloudType, string> = {
  normal: '#FFFFFF',
  trampoline: '#FF8FB1',
  breakable: '#C8C8D8',
  moving: '#C5E5FF',
  star: '#FFE89A',
};

export function getCloudColor(type: CloudType): string {
  return CLOUD_COLORS[type];
}

export function pickCloudType(level: number): CloudType {
  const r = Math.random();
  if (level === 1) {
    return r < 0.85 ? 'normal' : 'trampoline';
  }
  if (level === 2) {
    if (r < 0.6) return 'normal';
    if (r < 0.78) return 'trampoline';
    if (r < 0.92) return 'breakable';
    return 'star';
  }
  if (r < 0.45) return 'normal';
  if (r < 0.62) return 'trampoline';
  if (r < 0.78) return 'breakable';
  if (r < 0.9) return 'moving';
  return 'star';
}

let cloudIdCounter = 0;

export function resetCloudIdCounter() {
  cloudIdCounter = 0;
}

export function generateCloud(
  topY: number,
  level: number
): Cloud {
  const { CANVAS_WIDTH, CLOUD_WIDTH, CLOUD_HEIGHT, MOVING_CLOUD_SPEED } =
    CLOUD_JUMP_CONFIG;
  const type = pickCloudType(level);
  const x = Math.random() * (CANVAS_WIDTH - CLOUD_WIDTH);
  const vx =
    type === 'moving'
      ? (Math.random() < 0.5 ? -1 : 1) * MOVING_CLOUD_SPEED
      : 0;

  return {
    id: ++cloudIdCounter,
    x,
    y: topY,
    width: CLOUD_WIDTH,
    height: CLOUD_HEIGHT,
    type,
    vx,
    broken: false,
    used: false,
  };
}

export function generateInitialClouds(): Cloud[] {
  const { CANVAS_WIDTH, CANVAS_HEIGHT, CLOUD_COUNT, CLOUD_WIDTH } =
    CLOUD_JUMP_CONFIG;
  resetCloudIdCounter();
  resetFruitIdCounter();

  const clouds: Cloud[] = [];

  // 시작 발판 (정중앙, normal)
  clouds.push({
    id: ++cloudIdCounter,
    x: CANVAS_WIDTH / 2 - CLOUD_WIDTH / 2,
    y: CANVAS_HEIGHT - 80,
    width: CLOUD_WIDTH,
    height: CLOUD_JUMP_CONFIG.CLOUD_HEIGHT,
    type: 'normal',
    vx: 0,
    broken: false,
    used: false,
  });

  let lastY = CANVAS_HEIGHT - 80;
  for (let i = 1; i < CLOUD_COUNT; i++) {
    const gap =
      CLOUD_JUMP_CONFIG.MIN_VERTICAL_GAP +
      Math.random() *
        (CLOUD_JUMP_CONFIG.MAX_VERTICAL_GAP -
          CLOUD_JUMP_CONFIG.MIN_VERTICAL_GAP);
    lastY -= gap;
    clouds.push(generateCloud(lastY, 1));
  }

  return clouds;
}

interface FruitDef {
  emoji: string;
  score: number;
  weight: number;
}

const FRUIT_DEFS: Record<FruitType, FruitDef> = {
  strawberry: { emoji: '🍓', score: 30, weight: 50 },
  cherry: { emoji: '🍒', score: 60, weight: 30 },
  lemon: { emoji: '🍋', score: 100, weight: 15 },
  grape: { emoji: '🍇', score: 200, weight: 5 },
};

export function getFruitEmoji(type: FruitType): string {
  return FRUIT_DEFS[type].emoji;
}

export function getFruitScore(type: FruitType): number {
  return FRUIT_DEFS[type].score;
}

export function pickFruitType(): FruitType {
  const total = Object.values(FRUIT_DEFS).reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const [type, def] of Object.entries(FRUIT_DEFS) as [FruitType, FruitDef][]) {
    r -= def.weight;
    if (r <= 0) return type;
  }
  return 'strawberry';
}

let fruitIdCounter = 0;

export function resetFruitIdCounter() {
  fruitIdCounter = 0;
}

/**
 * 구름 바로 위(발판에 얹힌 위치)에 과일 1개를 스폰. 확률(`FRUIT_SPAWN_CHANCE`)에 따라 null 반환.
 */
export function maybeGenerateFruit(cloud: Cloud): Fruit | null {
  if (Math.random() > CLOUD_JUMP_CONFIG.FRUIT_SPAWN_CHANCE) return null;

  const { CANVAS_WIDTH, FRUIT_SIZE } = CLOUD_JUMP_CONFIG;

  // 구름 상단 바로 위에 얹힌 위치 (살짝 떠있는 듯한 2~6px 여유)
  const offsetY = 2 + Math.random() * 4;
  const fruitY = cloud.y - FRUIT_SIZE - offsetY;

  // x는 구름 가로 범위 안쪽 (양쪽 4px 마진)
  const minX = Math.max(0, cloud.x + 4);
  const maxX = Math.min(
    CANVAS_WIDTH - FRUIT_SIZE,
    cloud.x + cloud.width - 4 - FRUIT_SIZE
  );
  const x = maxX > minX ? minX + Math.random() * (maxX - minX) : minX;

  return {
    id: ++fruitIdCounter,
    x,
    y: fruitY,
    size: FRUIT_SIZE,
    type: pickFruitType(),
    spawnPhase: Math.random() * Math.PI * 2,
    collected: false,
  };
}

export function levelFromHeight(highestY: number): number {
  // y가 작아질수록 높이 ↑. 시작 0 기준
  const ascended = -highestY;
  if (ascended < 900) return 1;
  if (ascended < 2400) return 2;
  return 3;
}
