import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import type { MyScoreSummary } from '@/types/score';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const grouped = await prisma.score.groupBy({
    by: ['gameId'],
    where: { userId: session.userId },
    _max: { score: true },
    _count: { id: true },
  });

  const summaries: MyScoreSummary[] = grouped.map((g) => ({
    gameId: g.gameId,
    bestScore: g._max.score ?? 0,
    recentPlays: g._count.id,
  }));

  return NextResponse.json({ summaries });
}
