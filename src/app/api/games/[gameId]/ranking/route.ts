import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import type { GameRankingResponse, RankingEntry } from '@/types/score';

interface Context {
  params: { gameId: string };
}

export async function GET(request: Request, { params }: Context) {
  const { gameId } = params;
  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') || '5', 10) || 5, 1),
    50
  );

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const session = await getSession();

  // 사용자별 최고 점수만 집계 (한 사람이 여러 번 플레이해도 베스트 1개만)
  const bestPerUser = await prisma.score.groupBy({
    by: ['userId'],
    where: { gameId },
    _max: { score: true },
  });

  const sortedUserBests = bestPerUser
    .map((b) => ({ userId: b.userId, score: b._max.score ?? 0 }))
    .filter((b) => b.score > 0)
    .sort((a, b) => b.score - a.score);

  const topUserIds = sortedUserBests.slice(0, limit).map((b) => b.userId);

  // TOP N 사용자들의 베스트 스코어 레코드 + 사용자 정보 조회
  const topScores = topUserIds.length
    ? await prisma.score.findMany({
        where: {
          userId: { in: topUserIds },
          gameId,
        },
        orderBy: [{ score: 'desc' }, { playedAt: 'asc' }],
        include: { user: { select: { id: true, nickname: true } } },
      })
    : [];

  // 각 사용자별 베스트 1개만 선택
  const bestByUser = new Map<string, (typeof topScores)[number]>();
  for (const s of topScores) {
    if (!bestByUser.has(s.userId)) bestByUser.set(s.userId, s);
  }

  const ranking: RankingEntry[] = topUserIds
    .map((uid, idx) => {
      const score = bestByUser.get(uid);
      if (!score) return null;
      return {
        rank: idx + 1,
        userId: score.userId,
        nickname: score.user.nickname,
        characterId: score.characterId,
        score: score.score,
        maxCombo: score.maxCombo,
        playedAt: score.playedAt.toISOString(),
      };
    })
    .filter((e): e is RankingEntry => e !== null);

  let myBestScore: number | null = null;
  let myRank: number | null = null;

  if (session) {
    const mine = sortedUserBests.find((b) => b.userId === session.userId);
    if (mine) {
      myBestScore = mine.score;
      myRank = sortedUserBests.findIndex((b) => b.userId === session.userId) + 1;
    }
  }

  const response: GameRankingResponse = { ranking, myBestScore, myRank };
  return NextResponse.json(response);
}
