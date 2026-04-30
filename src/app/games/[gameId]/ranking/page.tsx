import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { RankingClient } from './RankingClient';

interface Props {
  params: { gameId: string };
}

export default async function RankingPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const game = await prisma.game.findUnique({ where: { id: params.gameId } });
  if (!game) notFound();

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col px-4 py-6 gap-4">
        <div className="flex items-center">
          <Link href="/games" className="text-text-dark text-xl px-1">
            ←
          </Link>
          <h1 className="flex-1 text-center font-pixel text-base text-text-dark">
            🏆 {game.name} 랭킹
          </h1>
          <div className="w-6" />
        </div>
        <RankingClient gameId={game.id} myUserId={session.userId} />
      </div>
    </MobileFrame>
  );
}
