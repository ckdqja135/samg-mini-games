import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/session';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [totalUsers, totalScores, gamesActive, todayPlays, byGame, byCharacter] =
    await Promise.all([
      prisma.user.count(),
      prisma.score.count(),
      prisma.game.count({ where: { isActive: true } }),
      prisma.score.count({
        where: {
          playedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.score.groupBy({
        by: ['gameId'],
        _count: { id: true },
        _max: { score: true },
      }),
      prisma.score.groupBy({
        by: ['characterId'],
        _count: { id: true },
      }),
    ]);

  return NextResponse.json({
    totalUsers,
    totalScores,
    gamesActive,
    todayPlays,
    byGame: byGame.map((g) => ({
      gameId: g.gameId,
      plays: g._count.id,
      topScore: g._max.score ?? 0,
    })),
    byCharacter: byCharacter
      .map((c) => ({ characterId: c.characterId, plays: c._count.id }))
      .sort((a, b) => b.plays - a.plays),
  });
}
