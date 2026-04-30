import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface Props {
  params: { gameId: string };
}

export default async function AdminGameStatsPage({ params }: Props) {
  const game = await prisma.game.findUnique({ where: { id: params.gameId } });
  if (!game) notFound();

  const [totalPlays, scoreAgg, charDist, top10] = await Promise.all([
    prisma.score.count({ where: { gameId: params.gameId } }),
    prisma.score.aggregate({
      where: { gameId: params.gameId },
      _avg: { score: true },
      _max: { score: true, maxCombo: true },
    }),
    prisma.score.groupBy({
      by: ['characterId'],
      where: { gameId: params.gameId },
      _count: { id: true },
    }),
    prisma.score.findMany({
      where: { gameId: params.gameId },
      orderBy: { score: 'desc' },
      take: 10,
      include: { user: { select: { nickname: true } } },
    }),
  ]);

  const totalChars = charDist.reduce((s, c) => s + c._count.id, 0) || 1;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-pixel text-2xl text-text-dark">🎮 {game.name}</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="card-cute py-4 text-center">
          <p className="text-xs text-text-light">총 플레이</p>
          <p className="font-pixel text-2xl text-primary-pink">{totalPlays}</p>
        </div>
        <div className="card-cute py-4 text-center">
          <p className="text-xs text-text-light">평균 점수</p>
          <p className="font-pixel text-2xl text-primary-pink">
            {Math.round(scoreAgg._avg.score ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="card-cute py-4 text-center">
          <p className="text-xs text-text-light">최고 점수</p>
          <p className="font-pixel text-2xl text-primary-pink">
            {(scoreAgg._max.score ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="card-cute">
        <h2 className="font-pixel text-base text-text-dark mb-3">
          캐릭터 사용 분포
        </h2>
        <div className="flex flex-col gap-2">
          {charDist
            .map((c) => ({ characterId: c.characterId, plays: c._count.id }))
            .sort((a, b) => b.plays - a.plays)
            .map((c) => {
              const pct = (c.plays / totalChars) * 100;
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
                  <span className="font-pixel text-xs text-text-light w-24 text-right">
                    {c.plays} ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      <div className="card-cute">
        <h2 className="font-pixel text-base text-text-dark mb-3">TOP 10</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-light text-xs font-pixel">
              <th className="text-left py-2">#</th>
              <th className="text-left">닉네임</th>
              <th className="text-left">캐릭터</th>
              <th className="text-right">점수</th>
              <th className="text-right">콤보</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((s, i) => (
              <tr key={s.id ?? i} className="border-t border-soft-pink/40">
                <td className="py-2 font-pixel text-text-light">{i + 1}</td>
                <td className="font-pixel text-text-dark">
                  {s.user.nickname}
                </td>
                <td className="font-pixel text-text-light">
                  {s.characterId}
                </td>
                <td className="text-right font-pixel text-primary-pink">
                  {s.score.toLocaleString()}
                </td>
                <td className="text-right font-pixel">{s.maxCombo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
