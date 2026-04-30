'use client';

import { useEffect, useState } from 'react';
import { RankingList } from '@/components/game/RankingList';
import type { GameRankingResponse } from '@/types/score';

interface Props {
  gameId: string;
  myUserId: string;
}

export function RankingClient({ gameId, myUserId }: Props) {
  const [data, setData] = useState<GameRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/games/${gameId}/ranking?limit=100`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <div className="text-center text-text-light font-pixel py-10">
        랭킹 불러오는 중...
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card-cute text-center text-text-light font-pixel py-6">
        랭킹을 불러오지 못했어요
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.myBestScore != null && data.myBestScore > 0 && (
        <div className="card-cute py-3 text-center">
          <p className="text-xs text-text-light">내 최고기록</p>
          <p className="font-pixel text-xl text-primary-pink mt-1">
            {data.myBestScore.toLocaleString()}점
            {data.myRank && (
              <span className="ml-2 text-sm text-text-light">
                #{data.myRank}위
              </span>
            )}
          </p>
        </div>
      )}

      <div className="card-cute">
        <h3 className="font-pixel text-sm text-text-dark mb-3">TOP 100</h3>
        <RankingList ranking={data.ranking} myUserId={myUserId} />
      </div>
    </div>
  );
}
