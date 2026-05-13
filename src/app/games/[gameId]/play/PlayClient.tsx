'use client';

import { useEffect, useRef, useState } from 'react';
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
  const recordInput = useGamePlayStore((s) => s.recordInput);
  const [mounted, setMounted] = useState(false);
  const recordInputRef = useRef(recordInput);
  recordInputRef.current = recordInput;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 게임 화면 전체에서 isTrusted 비율 추적 — 익스텐션 합성 클릭 탐지
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      recordInputRef.current(e.isTrusted);
    };
    const onKey = (e: KeyboardEvent) => {
      recordInputRef.current(e.isTrusted);
    };
    window.addEventListener('pointerdown', onPointer, { capture: true });
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', onPointer, { capture: true });
      window.removeEventListener('keydown', onKey, { capture: true });
    };
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
