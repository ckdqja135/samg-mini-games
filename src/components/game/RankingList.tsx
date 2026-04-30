'use client';

import type { RankingEntry } from '@/types/score';

interface RankingListProps {
  ranking: RankingEntry[];
  myUserId?: string | null;
  emptyMessage?: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

function rankBadge(rank: number): string {
  if (rank <= 3) return MEDALS[rank - 1];
  return `${rank}위`;
}

export function RankingList({
  ranking,
  myUserId,
  emptyMessage = '첫 도전자가 되어보세요! 🏆',
}: RankingListProps) {
  if (ranking.length === 0) {
    return (
      <div className="text-center py-6 px-3">
        <div className="text-3xl mb-2">🌸</div>
        <p className="text-sm text-text-dark font-pixel mb-1">아직 기록이 없어요</p>
        <p className="text-xs text-text-light font-pixel">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <ol className="ranking-list flex flex-col gap-1.5">
      {ranking.map((entry) => {
        const isMine = myUserId === entry.userId;
        return (
          <li
            key={`${entry.rank}-${entry.userId}`}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-cute
              font-pixel text-sm
              ${
                entry.rank === 1
                  ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300'
                  : entry.rank === 2
                  ? 'bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-300'
                  : entry.rank === 3
                  ? 'bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-300'
                  : 'bg-white/60'
              }
              ${isMine ? 'ring-2 ring-primary-pink' : ''}
            `}
          >
            <span
              className={`min-w-[40px] text-center ${
                entry.rank <= 3 ? 'text-lg' : 'text-text-light text-xs'
              }`}
            >
              {rankBadge(entry.rank)}
            </span>
            <span className="flex-1 text-text-dark truncate">
              {entry.nickname}
              {isMine && <span className="ml-1 text-primary-pink text-xs">(나)</span>}
            </span>
            <span className="text-primary-pink font-bold">
              {entry.score.toLocaleString()}점
            </span>
          </li>
        );
      })}
    </ol>
  );
}
