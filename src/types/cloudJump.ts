export type CloudType = 'normal' | 'trampoline' | 'breakable' | 'moving' | 'star';

export interface Cloud {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: CloudType;
  vx: number;
  broken: boolean;
  used: boolean;
}

export type FruitType = 'strawberry' | 'cherry' | 'lemon' | 'grape';

export interface Fruit {
  id: number;
  x: number;
  y: number;
  size: number;
  type: FruitType;
  spawnPhase: number; // bobbing 애니메이션 시작 오프셋
  collected: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hurtUntil: number;
}

export interface GameState {
  player: PlayerState;
  clouds: Cloud[];
  fruits: Fruit[];
  cameraY: number;
  highestY: number;
  level: number;
  spawnTopY: number;
  isGameOver: boolean;
  startedAt: number;
  /** 가장 최근에 점수/콤보가 적용된 구름 ID — 같은 구름 재착지 시 중복 카운트 방지 */
  lastScoredCloudId: number | null;
}

export interface GameOverResult {
  score: number;
  maxCombo: number;
  abilityActivations: number;
  characterId: string;
  gameId: string;
  durationMs: number;
  sessionToken: string | null;
  events: Array<{ t: number; k: 'p' | 's' | 'b'; v: number }>;
  untrustedInputs: number;
  totalInputs: number;
}
