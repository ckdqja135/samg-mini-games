import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { CharacterSelect } from '@/components/character/CharacterSelect';
import type { RankingEntry } from '@/types/score';

interface Props {
  params: { gameId: string };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TOP_LIMIT = 5;

async function getTopRanking(gameId: string): Promise<RankingEntry[]> {
  const bestPerUser = await prisma.score.groupBy({
    by: ['userId'],
    where: { gameId },
    _max: { score: true },
  });

  const sorted = bestPerUser
    .map((b) => ({ userId: b.userId, score: b._max.score ?? 0 }))
    .filter((b) => b.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_LIMIT);

  if (sorted.length === 0) return [];

  const topUserIds = sorted.map((s) => s.userId);
  const topScores = await prisma.score.findMany({
    where: { userId: { in: topUserIds }, gameId },
    orderBy: [{ score: 'desc' }, { playedAt: 'asc' }],
    include: { user: { select: { id: true, nickname: true } } },
  });

  const bestByUser = new Map<string, (typeof topScores)[number]>();
  for (const s of topScores) {
    if (!bestByUser.has(s.userId)) bestByUser.set(s.userId, s);
  }

  return sorted
    .map((s, idx) => {
      const best = bestByUser.get(s.userId);
      if (!best) return null;
      return {
        rank: idx + 1,
        userId: best.userId,
        nickname: best.user.nickname,
        characterId: best.characterId,
        score: best.score,
        maxCombo: best.maxCombo,
        playedAt: best.playedAt.toISOString(),
      };
    })
    .filter((e): e is RankingEntry => e !== null);
}

export default async function CharacterSelectPage({ params }: Props) {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }

  const game = await prisma.game.findUnique({
    where: { id: params.gameId },
  });

  if (!game) notFound();

  const topRanking = await getTopRanking(game.id);

  return (
    <MobileFrame>
      <CharacterSelect
        gameId={game.id}
        gameName={game.name}
        topRanking={topRanking}
        myUserId={session.userId}
      />
    </MobileFrame>
  );
}
