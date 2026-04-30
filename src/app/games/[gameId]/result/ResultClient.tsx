'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CharacterSprite } from '@/components/character/CharacterSprite';
import { CuteButton } from '@/components/ui/CuteButton';
import type { GameOverResult } from '@/types/cloudJump';

interface ResultClientProps {
  gameId: string;
  gameName: string;
}

export function ResultClient({ gameId, gameName }: ResultClientProps) {
  const [result, setResult] = useState<GameOverResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`samg:lastResult:${gameId}`);
      if (raw) setResult(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoaded(true);
  }, [gameId]);

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-pixel text-text-light">결과 불러오는 중...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3 text-center">
        <div className="text-5xl">🤔</div>
        <h2 className="font-pixel text-lg text-text-dark">
          결과 데이터가 없어요
        </h2>
        <Link href={`/games/${gameId}`} className="block w-full">
          <CuteButton variant="primary" fullWidth withSparkle>
            다시 시작하기
          </CuteButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-8 gap-4">
      <h1 className="font-pixel text-2xl text-primary-pink">
        🎉 Game Over! 🎉
      </h1>

      <div className="flex justify-center my-2">
        <CharacterSprite
          characterId={result.characterId}
          size={140}
          animation="celebrate"
        />
      </div>

      <p className="font-pixel text-text-dark">{gameName}</p>

      <div className="card-cute w-full text-center">
        <p className="text-xs text-text-light">최종 점수</p>
        <p className="font-pixel text-4xl text-primary-pink mt-1">
          ✨ {result.score.toLocaleString()} ✨
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        <div className="card-cute py-3 text-center">
          <p className="text-xs text-text-light">최고 콤보</p>
          <p className="font-pixel text-lg text-text-dark">{result.maxCombo}</p>
        </div>
        <div className="card-cute py-3 text-center">
          <p className="text-xs text-text-light">능력 발동</p>
          <p className="font-pixel text-lg text-text-dark">
            {result.abilityActivations}회
          </p>
        </div>
      </div>

      <p className="text-xs text-text-light text-center mt-2">
        점수 등록 + 랭킹 갱신은 Phase 5에서 추가됩니다
      </p>

      <div className="mt-auto w-full flex flex-col gap-2 pt-2">
        <Link href={`/games/${gameId}`} className="block">
          <CuteButton variant="primary" fullWidth withSparkle>
            🔄 다시하기
          </CuteButton>
        </Link>
        <Link href="/games" className="block">
          <CuteButton variant="secondary" fullWidth>
            🏠 게임선택
          </CuteButton>
        </Link>
      </div>
    </div>
  );
}
