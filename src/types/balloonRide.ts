export interface BalloonPlayer {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
}

/** 위/아래 한 쌍의 구름 벽 (사이에 통과 가능한 갭) */
export interface CloudWall {
  id: number;
  x: number;
  width: number;
  gapTop: number;    // 상단 벽 하단 y (갭 시작)
  gapBottom: number; // 하단 벽 상단 y (갭 끝)
  passed: boolean;
}

export type BalloonItemType = 'strawberry' | 'cherry' | 'lemon' | 'grape' | 'heart';

export interface BalloonItem {
  id: number;
  x: number;
  y: number;
  size: number;
  type: BalloonItemType;
  spawnPhase: number;
  collected: boolean;
}

export interface BalloonGameState {
  player: BalloonPlayer;
  walls: CloudWall[];
  items: BalloonItem[];
  scrollSpeed: number;
  distance: number;
  level: number;
  isGameOver: boolean;
  startedAt: number;
  spawnRightX: number; // 다음 스폰 x 위치 (가장 오른쪽 벽 + spacing)
}
