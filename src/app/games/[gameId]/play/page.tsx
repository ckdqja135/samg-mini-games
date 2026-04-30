import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { PlayClient } from './PlayClient';

interface Props {
  params: { gameId: string };
}

export default async function PlayPage({ params }: Props) {
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
      <PlayClient gameId={game.id} gameName={game.name} />
    </MobileFrame>
  );
}
