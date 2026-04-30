'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGamePlayStore } from '@/store/gameStore';
import { CloudJumpGame } from '@/components/game/CloudJumpGame';
import { BalloonRideGame } from '@/components/game/BalloonRideGame';
import { WaterDodgeGame } from '@/components/game/WaterDodgeGame';
import { CakeCatchGame } from '@/components/game/CakeCatchGame';
import { BalloonPopGame } from '@/components/game/BalloonPopGame';
import { StarLadderGame } from '@/components/game/StarLadderGame';
import { FruitRiverGame } from '@/components/game/FruitRiverGame';
import { CuteButton } from '@/components/ui/CuteButton';

interface PlayClientProps {
  gameId: string;
  gameName: string;
}

const SUPPORTED_GAMES = new Set([
  'cloud-jump',
  'balloon-ride',
  'water-dodge',
  'cake-catch',
  'balloon-pop',
  'star-ladder',
  'fruit-river',
]);

export function PlayClient({ gameId, gameName }: PlayClientProps) {
  const router = useRouter();
  const selectedCharacter = useGamePlayStore((s) => s.selectedCharacter);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-pixel text-text-light">준비 중...</p>
      </div>
    );
  }

  if (!selectedCharacter) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
        <div className="text-5xl">🤔</div>
        <h2 className="font-pixel text-lg text-text-dark">
          캐릭터를 먼저 골라주세요
        </h2>
        <p className="text-sm text-text-light">
          {gameName}을(를) 시작하려면<br />
          캐릭터 선택이 필요해요
        </p>
        <CuteButton
          variant="primary"
          fullWidth
          withSparkle
          onClick={() => router.push(`/games/${gameId}`)}
        >
          캐릭터 고르러 가기
        </CuteButton>
      </div>
    );
  }

  if (!SUPPORTED_GAMES.has(gameId)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3 text-center">
        <div className="text-5xl">🚧</div>
        <h2 className="font-pixel text-lg text-text-dark">
          {gameName}은 준비 중이에요
        </h2>
        <CuteButton
          variant="secondary"
          fullWidth
          onClick={() => router.push('/games')}
        >
          돌아가기
        </CuteButton>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center py-2">
      {gameId === 'cloud-jump' && (
        <CloudJumpGame gameId={gameId} characterId={selectedCharacter} />
      )}
      {gameId === 'balloon-ride' && (
        <BalloonRideGame gameId={gameId} characterId={selectedCharacter} />
      )}
      {gameId === 'water-dodge' && (
        <WaterDodgeGame gameId={gameId} characterId={selectedCharacter} />
      )}
      {gameId === 'cake-catch' && (
        <CakeCatchGame gameId={gameId} characterId={selectedCharacter} />
      )}
      {gameId === 'balloon-pop' && (
        <BalloonPopGame gameId={gameId} characterId={selectedCharacter} />
      )}
      {gameId === 'star-ladder' && (
        <StarLadderGame gameId={gameId} characterId={selectedCharacter} />
      )}
      {gameId === 'fruit-river' && (
        <FruitRiverGame gameId={gameId} characterId={selectedCharacter} />
      )}
    </div>
  );
}
