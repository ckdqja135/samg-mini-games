'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CuteButton } from '@/components/ui/CuteButton';
import { SparkleEffect } from '@/components/ui/SparkleEffect';
import { RankingList } from './RankingList';
import type { GameRankingResponse } from '@/types/score';

interface GameCardProps {
  game: {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
  };
  myUserId?: string | null;
}

export function GameCard({ game, myUserId }: GameCardProps) {
  const [data, setData] = useState<GameRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/games/${game.id}/ranking?limit=5`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game.id]);

  return (
    <div className="card-cute relative overflow-hidden">
      <div className="relative h-32 -mx-6 -mt-6 mb-4 bg-gradient-to-br from-soft-pink via-lavender to-sky flex items-center justify-center overflow-hidden">
        <span className="text-6xl">🎮</span>
        <SparkleEffect count={5} />
      </div>

      <h2 className="font-pixel text-lg text-text-dark mb-1">{game.name}</h2>
      <p className="text-sm text-text-light mb-4">{game.description}</p>

      <div className="mb-4">
        <h3 className="font-pixel text-sm text-text-dark mb-2">🏆 TOP 5 랭킹</h3>
        {loading ? (
          <div className="text-center text-text-light text-xs py-4 font-pixel">
            랭킹 불러오는 중...
          </div>
        ) : (
          <RankingList ranking={data?.ranking ?? []} myUserId={myUserId} />
        )}
      </div>

      {data?.myBestScore != null && data.myBestScore > 0 && (
        <div className="mb-4 px-3 py-2 rounded-cute bg-soft-pink/40 border border-soft-pink text-center">
          <span className="text-xs text-text-light">내 최고기록</span>
          <span className="block font-pixel text-base text-primary-pink">
            {data.myBestScore.toLocaleString()}점
            {data.myRank && data.myRank <= 100 && (
              <span className="ml-2 text-xs text-text-light">
                ({data.myRank}위)
              </span>
            )}
          </span>
        </div>
      )}

      <Link href={`/games/${game.id}`} className="block">
        <CuteButton variant="primary" fullWidth withSparkle>
          🎮 게임 시작
        </CuteButton>
      </Link>
    </div>
  );
}
