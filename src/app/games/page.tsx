import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { GameCard } from '@/components/game/GameCard';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { SettingsToggles } from '@/components/ui/SettingsToggles';
import { DailyMissionsCard } from '@/components/game/DailyMissionsCard';
import { AttendancePopup } from '@/components/game/AttendancePopup';

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
          <h1 className="flex-1 text-center font-sans font-bold text-lg text-text-dark tracking-tight">
            미니게임 선택
          </h1>
          <SettingsToggles compact />
          <LogoutButton />
        </div>

        <AttendancePopup />

        <Link
          href="/profile"
          className="card-cute flex items-center gap-3 py-3 hover:bg-white/90 transition-colors"
        >
          <div className="text-3xl">👋</div>
          <div className="flex-1">
            <p className="text-xs text-text-light">반가워요!</p>
            <p className="font-sans font-bold text-base text-primary-pink tracking-tight">
              {session.nickname}
            </p>
          </div>
          <span className="text-text-light text-sm font-sans font-semibold">내 기록 →</span>
        </Link>

        <DailyMissionsCard />

        <div className="grid grid-cols-3 gap-3">
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
          {games.length > 0 && (
            <div
              className="relative flex flex-col rounded-cute-lg overflow-hidden bg-white/60 border-2 border-dashed border-primary-pink/40"
              aria-label="다음 게임을 준비 중입니다"
            >
              <div className="relative aspect-square flex flex-col items-center justify-center text-center px-1.5 gap-0.5 bg-gradient-to-br from-cream to-soft-pink/30">
                <span className="text-2xl animate-float">✨</span>
                <p className="font-sans font-bold text-[11px] text-primary-pink leading-tight">
                  Coming<br />Soon
                </p>
              </div>
              <div className="px-2 pt-2 pb-2.5 text-center flex flex-col gap-1 justify-start">
                <p className="font-sans font-bold text-[13px] text-text-dark tracking-tight leading-tight">
                  새 게임 준비중
                </p>
                <p className="font-sans text-[12px] text-text-dark/70 leading-snug line-clamp-2 min-h-[2.6em]">
                  곧 새로운 미니게임이 찾아갈 거예요!
                </p>
              </div>
            </div>
          )}
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
