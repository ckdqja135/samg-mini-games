import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { GameCard } from '@/components/game/GameCard';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { SettingsToggles } from '@/components/ui/SettingsToggles';

export default async function GamesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }

  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col px-6 py-6 gap-5">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-text-dark text-xl px-1">
            ←
          </Link>
          <h1 className="flex-1 text-center font-pixel text-lg text-text-dark">
            미니게임 선택
          </h1>
          <SettingsToggles compact />
          <LogoutButton />
        </div>

        <div className="card-cute flex items-center gap-3 py-3">
          <div className="text-3xl">👋</div>
          <div className="flex-1">
            <p className="text-xs text-text-light">반가워요!</p>
            <p className="font-pixel text-base text-primary-pink">
              {session.nickname}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={{
                id: game.id,
                name: game.name,
                description: game.description,
                thumbnail: game.thumbnail,
              }}
              myUserId={session.userId}
            />
          ))}
        </div>

        {games.length === 0 && (
          <div className="card-cute text-center text-text-light text-sm py-8">
            아직 활성화된 게임이 없어요
          </div>
        )}
      </div>
    </MobileFrame>
  );
}
