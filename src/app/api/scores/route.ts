import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import type { SubmitScoreRequest, SubmitScoreResponse } from '@/types/score';

const MAX_REASONABLE_SCORE = 1_000_000;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Partial<SubmitScoreRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { gameId, characterId, score, maxCombo, abilityActivations } = body;

  if (
    typeof gameId !== 'string' ||
    typeof characterId !== 'string' ||
    typeof score !== 'number' ||
    typeof maxCombo !== 'number' ||
    typeof abilityActivations !== 'number'
  ) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (
    !Number.isFinite(score) ||
    score < 0 ||
    score > MAX_REASONABLE_SCORE ||
    maxCombo < 0 ||
    abilityActivations < 0
  ) {
    return NextResponse.json({ error: 'Invalid values' }, { status: 400 });
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const previousBest = await prisma.score.aggregate({
    where: { userId: session.userId, gameId },
    _max: { score: true },
  });

  const previousBestScore = previousBest._max.score ?? 0;
  const isNewRecord = Math.floor(score) > previousBestScore;

  await prisma.score.create({
    data: {
      userId: session.userId,
      gameId,
      characterId,
      score: Math.floor(score),
      maxCombo: Math.floor(maxCombo),
      abilityActivations: Math.floor(abilityActivations),
    },
  });

  // 새 점수 기준으로 등수 계산 (사용자별 베스트 기준)
  const allBests = await prisma.score.groupBy({
    by: ['userId'],
    where: { gameId },
    _max: { score: true },
  });

  const sorted = allBests
    .map((b) => ({ userId: b.userId, score: b._max.score ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const rank = sorted.findIndex((b) => b.userId === session.userId) + 1;
  const top5Updated = isNewRecord && rank > 0 && rank <= 5;

  const response: SubmitScoreResponse = {
    rank,
    isNewRecord,
    top5Updated,
  };

  return NextResponse.json(response);
}
