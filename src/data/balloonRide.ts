import type {
  BalloonItem,
  BalloonItemType,
  CloudWall,
} from '@/types/balloonRide';

export const BALLOON_RIDE_CONFIG = {
  CANVAS_WIDTH: 375,
  CANVAS_HEIGHT: 700,

  GRAVITY: 0.09,
  PUFF_VELOCITY: -3.6,
  MAX_FALL_SPEED: 3.6,

  PLAYER_X: 92,
  PLAYER_WIDTH: 44,
  PLAYER_HEIGHT: 60,

  BASE_SCROLL_SPEED: 2.1,
  MAX_SCROLL_SPEED: 4.0,

  WALL_WIDTH: 56,
  BASE_WALL_GAP: 190,
  MIN_WALL_GAP: 120,
  BASE_WALL_SPACING: 205,
  MIN_WALL_SPACING: 150,

  ITEM_SIZE: 28,
  ITEM_SPAWN_CHANCE: 0.55,

  DISTANCE_TICK_FRAMES: 30, // 매 30프레임 = 0.5초마다 +1 거리점수
  GATE_PASS_BONUS: 50,

  TOP_PADDING: 12,
  BOTTOM_PADDING: 12,
};

interface ItemDef {
  emoji: string;
  score: number;
  weight: number;
}

const ITEM_DEFS: Record<BalloonItemType, ItemDef> = {
  strawberry: { emoji: '🍓', score: 30, weight: 45 },
  cherry: { emoji: '🍒', score: 60, weight: 25 },
  lemon: { emoji: '🍋', score: 100, weight: 12 },
  grape: { emoji: '🍇', score: 200, weight: 5 },
  heart: { emoji: '💖', score: 150, weight: 13 },
};

export function getBalloonItemEmoji(type: BalloonItemType): string {
  return ITEM_DEFS[type].emoji;
}

export function getBalloonItemScore(type: BalloonItemType): number {
  return ITEM_DEFS[type].score;
}

export function pickItemType(): BalloonItemType {
  const total = Object.values(ITEM_DEFS).reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const [type, def] of Object.entries(ITEM_DEFS) as [
    BalloonItemType,
    ItemDef,
  ][]) {
    r -= def.weight;
    if (r <= 0) return type;
  }
  return 'strawberry';
}

let wallIdCounter = 0;
let itemIdCounter = 0;

export function resetCounters() {
  wallIdCounter = 0;
  itemIdCounter = 0;
}

export function levelFromDistance(distance: number): number {
  if (distance < 40) return 1;
  if (distance < 120) return 2;
  if (distance < 240) return 3;
  return 4;
}

export function paramsForLevel(level: number) {
  const t = Math.min(1, (level - 1) / 3);
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    scrollSpeed: lerp(
      BALLOON_RIDE_CONFIG.BASE_SCROLL_SPEED,
      BALLOON_RIDE_CONFIG.MAX_SCROLL_SPEED
    ),
    wallGap: lerp(
      BALLOON_RIDE_CONFIG.BASE_WALL_GAP,
      BALLOON_RIDE_CONFIG.MIN_WALL_GAP
    ),
    wallSpacing: lerp(
      BALLOON_RIDE_CONFIG.BASE_WALL_SPACING,
      BALLOON_RIDE_CONFIG.MIN_WALL_SPACING
    ),
  };
}

export function generateWall(x: number, level: number): CloudWall {
  const { CANVAS_HEIGHT, WALL_WIDTH, TOP_PADDING, BOTTOM_PADDING } =
    BALLOON_RIDE_CONFIG;
  const { wallGap } = paramsForLevel(level);

  const minTop = TOP_PADDING + 30;
  const maxTop = CANVAS_HEIGHT - BOTTOM_PADDING - 30 - wallGap;
  const gapTop = minTop + Math.random() * (maxTop - minTop);
  const gapBottom = gapTop + wallGap;

  return {
    id: ++wallIdCounter,
    x,
    width: WALL_WIDTH,
    gapTop,
    gapBottom,
    passed: false,
  };
}

/**
 * 두 벽 사이 영역에 과일/하트 1개를 확률적으로 스폰.
 * 양 벽의 갭이 겹치는 영역에 위치시켜 통과 시 자연스럽게 수집 가능.
 */
export function maybeGenerateItem(
  prevWall: CloudWall,
  nextWall: CloudWall
): BalloonItem | null {
  if (Math.random() > BALLOON_RIDE_CONFIG.ITEM_SPAWN_CHANCE) return null;
  const { ITEM_SIZE } = BALLOON_RIDE_CONFIG;

  const minX = prevWall.x + prevWall.width + 12;
  const maxX = nextWall.x - 12 - ITEM_SIZE;
  if (maxX <= minX) return null;

  // y는 두 벽 갭의 교집합에서 선택 (없으면 한쪽 갭 사용)
  const overlapTop = Math.max(prevWall.gapTop, nextWall.gapTop);
  const overlapBottom = Math.min(prevWall.gapBottom, nextWall.gapBottom);
  const minY =
    overlapBottom - overlapTop > ITEM_SIZE + 16
      ? overlapTop + 8
      : (prevWall.gapTop + prevWall.gapBottom) / 2 - ITEM_SIZE / 2;
  const maxY =
    overlapBottom - overlapTop > ITEM_SIZE + 16
      ? overlapBottom - ITEM_SIZE - 8
      : minY;

  const y = maxY > minY ? minY + Math.random() * (maxY - minY) : minY;
  const x = minX + Math.random() * (maxX - minX);

  return {
    id: ++itemIdCounter,
    x,
    y,
    size: ITEM_SIZE,
    type: pickItemType(),
    spawnPhase: Math.random() * Math.PI * 2,
    collected: false,
  };
}
