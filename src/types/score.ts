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
  /** 게임 시작 시 발급받은 HMAC 세션 토큰 */
  sessionToken: string;
  /** 점수 이벤트 로그 — 서버에서 패턴 검증 */
  events: Array<{ t: number; k: 'p' | 's' | 'b'; v: number }>;
  /** 비신뢰 입력 개수 (isTrusted=false 인 pointer/key 이벤트) */
  untrustedInputs: number;
  /** 전체 입력 개수 (canvas/window pointer/key) */
  totalInputs: number;
}

export interface SubmitScoreResponse {
  rank: number;
  isNewRecord: boolean;
  top5Updated: boolean;
}
