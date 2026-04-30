export interface GameOverResult {
  gameId: string;
  characterId: string;
  score: number;
  maxCombo: number;
  abilityActivations: number;
  durationMs: number;
}
