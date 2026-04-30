import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user, perGame, byCharacter, totalPlays, recent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, nickname: true, phoneNumber: true, createdAt: true },
    }),
    prisma.score.groupBy({
      by: ['gameId'],
      where: { userId: session.userId },
      _max: { score: true, maxCombo: true },
      _count: { id: true },
    }),
    prisma.score.groupBy({
      by: ['characterId'],
      where: { userId: session.userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.score.count({ where: { userId: session.userId } }),
    prisma.score.findMany({
      where: { userId: session.userId },
      orderBy: { playedAt: 'desc' },
      take: 10,
      include: { game: { select: { name: true } } },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      nickname: user.nickname,
      phoneNumber: user.phoneNumber.replace(/(\d{3})(\d{4})(\d+)/, '$1-****-$3'),
      createdAt: user.createdAt.toISOString(),
    },
    totalPlays,
    perGame: perGame.map((g) => ({
      gameId: g.gameId,
      bestScore: g._max.score ?? 0,
      bestCombo: g._max.maxCombo ?? 0,
      plays: g._count.id,
    })),
    favoriteCharacters: byCharacter.map((c) => ({
      characterId: c.characterId,
      plays: c._count.id,
    })),
    recentPlays: recent.map((s) => ({
      id: s.id,
      gameId: s.gameId,
      gameName: s.game.name,
      characterId: s.characterId,
      score: s.score,
      maxCombo: s.maxCombo,
      playedAt: s.playedAt.toISOString(),
    })),
  });
}
