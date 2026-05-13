import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import {
  generateNonce,
  signGameSessionToken,
} from '@/lib/gameSession';

/** 같은 유저가 분당 발급 받을 수 있는 세션 토큰 수 — 무한 토큰 발급 어뷰징 차단 */
const MAX_SESSION_STARTS_PER_MINUTE = 20;
const sessionStartLog = new Map<string, number[]>();

function isSessionStartRateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (sessionStartLog.get(userId) || []).filter(
    (t) => now - t < 60_000
  );
  if (arr.length >= MAX_SESSION_STARTS_PER_MINUTE) {
    sessionStartLog.set(userId, arr);
    return true;
  }
  arr.push(now);
  sessionStartLog.set(userId, arr);
  return false;
}

interface StartSessionRequest {
  characterId?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isSessionStartRateLimited(session.userId)) {
    return NextResponse.json(
      { error: '세션을 너무 자주 시작했어요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  let body: StartSessionRequest = {};
  try {
    body = (await request.json()) as StartSessionRequest;
  } catch {
    // 빈 body 허용
  }

  const characterId =
    typeof body.characterId === 'string' ? body.characterId : '';
  if (!characterId) {
    return NextResponse.json(
      { error: 'characterId is required' },
      { status: 400 }
    );
  }

  const game = await prisma.game.findUnique({
    where: { id: params.gameId },
  });
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const nonce = generateNonce();
  const gameSession = await prisma.gameSession.create({
    data: {
      userId: session.userId,
      gameId: params.gameId,
      characterId,
      nonce,
    },
  });

  const token = await signGameSessionToken({
    sessionId: gameSession.id,
    userId: session.userId,
    gameId: params.gameId,
    characterId,
    nonce,
  });

  return NextResponse.json({
    sessionId: gameSession.id,
    sessionToken: token,
    startedAt: gameSession.startedAt.toISOString(),
  });
}
