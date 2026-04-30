import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/session';

interface Ctx {
  params: { gameId: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const game = await prisma.game.findUnique({ where: { id: params.gameId } });
  if (!game) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [totalPlays, scoreAgg, charDist, top10] = await Promise.all([
    prisma.score.count({ where: { gameId: params.gameId } }),
    prisma.score.aggregate({
      where: { gameId: params.gameId },
      _avg: { score: true },
      _max: { score: true, maxCombo: true },
    }),
    prisma.score.groupBy({
      by: ['characterId'],
      where: { gameId: params.gameId },
      _count: { id: true },
    }),
    prisma.score.findMany({
      where: { gameId: params.gameId },
      orderBy: { score: 'desc' },
      take: 10,
      include: { user: { select: { nickname: true } } },
    }),
  ]);

  return NextResponse.json({
    game: { id: game.id, name: game.name },
    totalPlays,
    avgScore: Math.round(scoreAgg._avg.score ?? 0),
    maxScore: scoreAgg._max.score ?? 0,
    maxCombo: scoreAgg._max.maxCombo ?? 0,
    characterDistribution: charDist
      .map((c) => ({ characterId: c.characterId, plays: c._count.id }))
      .sort((a, b) => b.plays - a.plays),
    top10: top10.map((s) => ({
      nickname: s.user.nickname,
      characterId: s.characterId,
      score: s.score,
      maxCombo: s.maxCombo,
      playedAt: s.playedAt.toISOString(),
    })),
  });
}
