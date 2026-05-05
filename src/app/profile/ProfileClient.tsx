'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CharacterSprite } from '@/components/character/CharacterSprite';
import { CHARACTER_SPRITES } from '@/data/characterSprite';

interface ProfileData {
  user: {
    id: string;
    nickname: string;
    phoneNumber: string;
    createdAt: string;
  };
  totalPlays: number;
  perGame: { gameId: string; bestScore: number; bestCombo: number; plays: number }[];
  favoriteCharacters: { characterId: string; plays: number }[];
  recentPlays: {
    id: string;
    gameId: string;
    gameName: string;
    characterId: string;
    score: number;
    maxCombo: number;
    playedAt: string;
  }[];
}

const GAME_NAMES: Record<string, string> = {
  'cloud-jump': '포실핑의 구름 점프',
  'balloon-ride': '방글핑의 풍선 여행',
  'water-dodge': '꽁꽁핑의 물줄기 피하기',
  'cake-catch': '달콤핑의 디저트 파티',
  'balloon-pop': '큐핑의 풍선 펑펑',
  'star-ladder': '샤샤핑의 별빛 사다리',
  'fruit-river': '새콤핑의 과일 강물',
};

export function ProfileClient() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center text-text-light font-sans py-10">
        불러오는 중...
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card-cute text-center text-text-light font-sans py-6">
        데이터를 불러오지 못했어요
      </div>
    );
  }

  const top = data.favoriteCharacters[0];
  const topChar = top ? CHARACTER_SPRITES.find((c) => c.id === top.characterId) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="card-cute flex items-center gap-4">
        {topChar ? (
          <CharacterSprite characterId={topChar.id} size={70} animation="walk" />
        ) : (
          <div className="text-5xl">💖</div>
        )}
        <div className="flex-1">
          <p className="font-sans font-bold text-lg text-primary-pink tracking-tight">
            {data.user.nickname}
          </p>
          <p className="text-xs text-text-light font-sans tabular-nums">
            {data.user.phoneNumber}
          </p>
          <p className="text-xs text-text-light mt-1 font-sans">
            총 플레이{' '}
            <strong className="text-text-dark font-bold tabular-nums">
              {data.totalPlays}
            </strong>
            회
          </p>
        </div>
      </div>

      <div className="card-cute">
        <h2 className="font-sans font-bold text-sm text-text-dark mb-3 tracking-tight">
          게임별 최고기록
        </h2>
        {data.perGame.length === 0 ? (
          <p className="text-xs text-text-light text-center py-3 font-sans">
            아직 플레이한 게임이 없어요
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.perGame
              .sort((a, b) => b.bestScore - a.bestScore)
              .map((g) => (
                <Link
                  key={g.gameId}
                  href={`/games/${g.gameId}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-cute bg-white/60 hover:bg-white/90 transition-colors"
                >
                  <span className="flex-1 font-sans font-semibold text-sm text-text-dark truncate">
                    {GAME_NAMES[g.gameId] ?? g.gameId}
                  </span>
                  <span className="text-xs text-text-light font-sans tabular-nums">
                    {g.plays}회
                  </span>
                  <span className="font-sans font-bold text-primary-pink tabular-nums">
                    {g.bestScore.toLocaleString()}점
                  </span>
                </Link>
              ))}
          </div>
        )}
      </div>

      <div className="card-cute">
        <h2 className="font-sans font-bold text-sm text-text-dark mb-3 tracking-tight">
          자주 쓴 캐릭터
        </h2>
        {data.favoriteCharacters.length === 0 ? (
          <p className="text-xs text-text-light text-center py-3 font-sans">
            아직 캐릭터를 골라 플레이한 기록이 없어요
          </p>
        ) : (
          <div className="flex justify-around items-end">
            {data.favoriteCharacters.slice(0, 3).map((c, idx) => {
              const char = CHARACTER_SPRITES.find((s) => s.id === c.characterId);
              if (!char) return null;
              return (
                <div key={c.characterId} className="flex flex-col items-center gap-1">
                  <CharacterSprite
                    characterId={char.id}
                    size={idx === 0 ? 70 : 50}
                    animation={idx === 0 ? 'celebrate' : 'idle'}
                  />
                  <span className="font-sans font-semibold text-xs text-text-dark">
                    {char.name}
                  </span>
                  <span className="text-[10px] text-text-light font-sans tabular-nums">
                    {c.plays}회
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card-cute">
        <h2 className="font-sans font-bold text-sm text-text-dark mb-3 tracking-tight">
          최근 플레이
        </h2>
        {data.recentPlays.length === 0 ? (
          <p className="text-xs text-text-light text-center py-3 font-sans">
            기록이 없어요
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.recentPlays.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 px-3 py-2 rounded-cute bg-white/60 font-sans text-sm"
              >
                <span className="flex-1 font-semibold text-text-dark truncate">
                  {GAME_NAMES[p.gameId] ?? p.gameId}
                </span>
                <span className="text-xs text-text-light tabular-nums">
                  콤보 {p.maxCombo}
                </span>
                <span className="font-bold text-primary-pink tabular-nums">
                  {p.score.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
