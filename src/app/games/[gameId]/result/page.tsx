import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { ResultClient } from './ResultClient';

interface Props {
  params: { gameId: string };
}

export default async function ResultPage({ params }: Props) {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }

  const game = await prisma.game.findUnique({
    where: { id: params.gameId },
  });
  if (!game) notFound();

  return (
    <MobileFrame>
      <ResultClient gameId={game.id} gameName={game.name} />
    </MobileFrame>
  );
}
