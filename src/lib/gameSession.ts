import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

/**
 * 게임 세션 토큰 — 한 판의 게임 시작 시 발급, 점수 등록 시 검증.
 * 기존 로그인 JWT와는 별도의 시크릿/만료를 사용해 분리.
 */
const SESSION_JWT_SECRET = new TextEncoder().encode(
  process.env.GAME_SESSION_SECRET ||
    process.env.JWT_SECRET ||
    'dev-game-session-secret-change-me-32chars'
);

/** 게임 한 판의 최대 허용 시간 (초). 이 시간 넘으면 토큰 만료. */
export const GAME_SESSION_MAX_DURATION_SEC = 60 * 15; // 15분

export interface GameSessionTokenPayload {
  sessionId: string;
  userId: string;
  gameId: string;
  characterId: string;
  nonce: string;
}

export async function signGameSessionToken(
  payload: GameSessionTokenPayload
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${GAME_SESSION_MAX_DURATION_SEC}s`)
    .sign(SESSION_JWT_SECRET);
}

export async function verifyGameSessionToken(
  token: string
): Promise<GameSessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_JWT_SECRET);
    if (
      typeof payload.sessionId !== 'string' ||
      typeof payload.userId !== 'string' ||
      typeof payload.gameId !== 'string' ||
      typeof payload.characterId !== 'string' ||
      typeof payload.nonce !== 'string'
    ) {
      return null;
    }
    return {
      sessionId: payload.sessionId,
      userId: payload.userId,
      gameId: payload.gameId,
      characterId: payload.characterId,
      nonce: payload.nonce,
    };
  } catch {
    return null;
  }
}

/** crypto.randomUUID는 일부 구버전에서 누락 — 안전한 fallback */
export function generateNonce(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // 매우 드문 경우의 폴백
    return Array.from({ length: 4 }, () =>
      Math.random().toString(36).slice(2)
    ).join('');
  }
}
