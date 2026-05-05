import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import {
  isRateLimited,
  PER_GAME_MAX_SCORE,
  PER_GAME_MAX_SCORE_PER_SEC,
} from '@/lib/scoreLimits';
import { kstDateString } from '@/lib/dateUtils';
import type { SubmitScoreRequest, SubmitScoreResponse } from '@/types/score';

const HARD_MAX = 1_000_000;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isRateLimited(session.userId)) {
    return NextResponse.json(
      { error: '너무 빠르게 등록했어요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  let body: Partial<SubmitScoreRequest> & { durationMs?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    gameId,
    characterId,
    score,
    maxCombo,
    abilityActivations,
    durationMs,
  } = body;

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
    score > HARD_MAX ||
    maxCombo < 0 ||
    abilityActivations < 0
  ) {
    return NextResponse.json({ error: 'Invalid values' }, { status: 400 });
  }

  // 게임별 max 점수 검증
  const perGameMax = PER_GAME_MAX_SCORE[gameId];
  if (perGameMax && score > perGameMax) {
    return NextResponse.json(
      { error: '비정상적인 점수입니다' },
      { status: 400 }
    );
  }

  // 점수율 검증 (durationMs 제공 시)
  if (
    typeof durationMs === 'number' &&
    durationMs > 0 &&
    PER_GAME_MAX_SCORE_PER_SEC[gameId]
  ) {
    const ratePerSec = score / (durationMs / 1000);
    if (ratePerSec > PER_GAME_MAX_SCORE_PER_SEC[gameId]) {
      return NextResponse.json(
        { error: '비정상적인 점수율입니다' },
        { status: 400 }
      );
    }
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
  const finalScore = Math.floor(score);
  const finalMaxCombo = Math.floor(maxCombo);
  const finalAbilityCount = Math.floor(abilityActivations);
  const isNewRecord = finalScore > previousBestScore;

  await prisma.score.create({
    data: {
      userId: session.userId,
      gameId,
      characterId,
      score: finalScore,
      maxCombo: finalMaxCombo,
      abilityActivations: finalAbilityCount,
    },
  });

  // 일일 미션 진행도 갱신 (실패해도 점수 등록은 성공으로)
  try {
    await updateDailyChallenges(
      session.userId,
      finalScore,
      finalMaxCombo
    );
  } catch (err) {
    console.error('updateDailyChallenges failed:', err);
  }

  // 등수 계산
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

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games/${gameId}/ranking`);

  const response: SubmitScoreResponse = {
    rank,
    isNewRecord,
    top5Updated,
  };

  return NextResponse.json(response);
}

async function updateDailyChallenges(
  userId: string,
  scoreThisPlay: number,
  comboThisPlay: number
) {
  const date = kstDateString();
  const challenges = await prisma.dailyChallenge.findMany({
    where: { userId, date },
  });
  if (challenges.length === 0) return;

  for (const c of challenges) {
    if (c.completed) continue;
    let newProgress = c.progress;
    if (c.type === 'play_games') {
      newProgress = c.progress + 1;
    } else if (c.type === 'total_score') {
      newProgress = c.progress + scoreThisPlay;
    } else if (c.type === 'max_combo') {
      newProgress = Math.max(c.progress, comboThisPlay);
    }
    const completed = newProgress >= c.target;
    if (newProgress !== c.progress || completed !== c.completed) {
      await prisma.dailyChallenge.update({
        where: { id: c.id },
        data: { progress: newProgress, completed },
      });
    }
  }
}
