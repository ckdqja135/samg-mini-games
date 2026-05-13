export interface GameOverResult {
  gameId: string;
  characterId: string;
  score: number;
  maxCombo: number;
  abilityActivations: number;
  durationMs: number;
  /** 서버 발급 세션 토큰 (점수 등록 시 필수) */
  sessionToken: string | null;
  /** 점수 이벤트 로그 — 서버 검증용 */
  events: Array<{ t: number; k: 'p' | 's' | 'b'; v: number }>;
  /** isTrusted=false 입력 수 */
  untrustedInputs: number;
  /** 전체 입력 수 */
  totalInputs: number;
}
