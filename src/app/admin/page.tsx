import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function AdminOverviewPage() {
  const [totalUsers, totalScores, todayPlays, byGame, byCharacter, games] =
    await Promise.all([
      prisma.user.count(),
      prisma.score.count(),
      prisma.score.count({
        where: {
          playedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.score.groupBy({
        by: ['gameId'],
        _count: { id: true },
        _max: { score: true },
      }),
      prisma.score.groupBy({
        by: ['characterId'],
        _count: { id: true },
      }),
      prisma.game.findMany({ orderBy: { id: 'asc' } }),
    ]);

  const charSorted = byCharacter
    .map((c) => ({ characterId: c.characterId, plays: c._count.id }))
    .sort((a, b) => b.plays - a.plays);
  const totalCharPlays = charSorted.reduce((s, c) => s + c.plays, 0) || 1;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-pixel text-2xl text-text-dark">개요</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="card-cute py-4 text-center">
          <p className="text-xs text-text-light">총 사용자</p>
          <p className="font-pixel text-2xl text-primary-pink">{totalUsers}</p>
        </div>
        <div className="card-cute py-4 text-center">
          <p className="text-xs text-text-light">총 플레이</p>
          <p className="font-pixel text-2xl text-primary-pink">{totalScores}</p>
        </div>
        <div className="card-cute py-4 text-center">
          <p className="text-xs text-text-light">최근 24시간</p>
          <p className="font-pixel text-2xl text-primary-pink">{todayPlays}</p>
        </div>
      </div>

      <div className="card-cute">
        <h2 className="font-pixel text-base text-text-dark mb-3">🎮 게임별 통계</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-light text-xs font-pixel">
              <th className="text-left py-2">게임</th>
              <th className="text-right">플레이</th>
              <th className="text-right">최고점</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const stat = byGame.find((b) => b.gameId === g.id);
              return (
                <tr key={g.id} className="border-t border-soft-pink/40">
                  <td className="py-2 font-pixel text-text-dark">{g.name}</td>
                  <td className="text-right font-pixel">
                    {stat?._count.id ?? 0}
                  </td>
                  <td className="text-right font-pixel text-primary-pink">
                    {(stat?._max.score ?? 0).toLocaleString()}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/admin/games/${g.id}`}
                      className="text-xs text-text-light hover:text-primary-pink font-pixel"
                    >
                      상세 →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-cute">
        <h2 className="font-pixel text-base text-text-dark mb-3">
          💖 캐릭터 사용 분포
        </h2>
        <div className="flex flex-col gap-2">
          {charSorted.map((c) => {
            const pct = (c.plays / totalCharPlays) * 100;
            return (
              <div key={c.characterId} className="flex items-center gap-2">
                <span className="font-pixel text-xs w-20 text-text-dark">
                  {c.characterId}
                </span>
                <div className="flex-1 h-3 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-pink to-soft-pink"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-pixel text-xs text-text-light w-20 text-right">
                  {c.plays} ({pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}
          {charSorted.length === 0 && (
            <p className="text-xs text-text-light text-center py-3 font-pixel">
              아직 데이터가 없어요
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
