export interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  characterId: string;
  score: number;
  maxCombo: number;
  playedAt: string;
}

export interface GameRankingResponse {
  ranking: RankingEntry[];
  myBestScore: number | null;
  myRank: number | null;
}

export interface MyScoreSummary {
  gameId: string;
  bestScore: number;
  recentPlays: number;
}

export interface SubmitScoreRequest {
  gameId: string;
  characterId: string;
  score: number;
  maxCombo: number;
  abilityActivations: number;
}

export interface SubmitScoreResponse {
  rank: number;
  isNewRecord: boolean;
  top5Updated: boolean;
}
