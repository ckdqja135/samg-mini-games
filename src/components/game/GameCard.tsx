'use client';

import Link from 'next/link';
import { SparkleEffect } from '@/components/ui/SparkleEffect';
import { GAME_RECOMMENDATIONS } from '@/data/gameRecommendations';
import { CHARACTER_SPRITES } from '@/data/characterSprite';

interface GameCardProps {
  game: {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
  };
  myUserId?: string | null;
}

const GAME_EMOJI: Record<string, string> = {
  'cloud-jump': '☁️',
  'balloon-ride': '🎈',
  'water-dodge': '💧',
  'cake-catch': '🍰',
  'balloon-pop': '🎯',
  'star-ladder': '🪜',
  'fruit-river': '🌊',
};

export function GameCard({ game }: GameCardProps) {
  const rec = GAME_RECOMMENDATIONS[game.id];
  const recChar = rec
    ? CHARACTER_SPRITES.find((c) => c.id === rec.primary)
    : null;
  const emoji = GAME_EMOJI[game.id] ?? '🎮';

  return (
    <Link
      href={`/games/${game.id}`}
      className="group relative flex flex-col rounded-cute-lg overflow-hidden bg-white/85 shadow-cute-mint/0 shadow-md hover:shadow-lg active:translate-y-0.5 transition-all"
    >
      <div className="relative aspect-square bg-gradient-to-br from-soft-pink via-lavender to-sky flex items-center justify-center overflow-hidden">
        <span className="text-4xl drop-shadow-sm">{emoji}</span>
        <SparkleEffect count={3} />
        {recChar && (
          <span
            className="absolute top-1.5 right-1.5 text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-full text-white shadow-sm"
            style={{ backgroundColor: recChar.color }}
            title={`추천: ${recChar.name}`}
          >
            {recChar.name}
          </span>
        )}
      </div>
      <div className="px-2 pt-2 pb-2.5 text-center flex flex-col gap-1">
        <h2 className="font-sans font-bold text-[13px] text-text-dark tracking-tight leading-tight line-clamp-1">
          {game.name}
        </h2>
        <p className="font-sans text-[12px] text-text-dark/70 leading-snug line-clamp-2 min-h-[2.6em]">
          {game.description}
        </p>
      </div>
    </Link>
  );
}
