import { prisma } from '@/lib/prisma';

interface SearchParams {
  searchParams: { q?: string; page?: string };
}

export default async function AdminUsersPage({ searchParams }: SearchParams) {
  const q = (searchParams.q || '').trim();
  const page = Math.max(1, parseInt(searchParams.page || '1', 10));
  const pageSize = 30;

  const where = q
    ? { OR: [{ nickname: { contains: q } }, { phoneNumber: { contains: q } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        nickname: true,
        phoneNumber: true,
        isAdmin: true,
        createdAt: true,
        _count: { select: { scores: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-pixel text-2xl text-text-dark">사용자 ({total})</h1>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="닉네임 / 전화번호 검색"
          className="input-cute flex-1"
        />
        <button type="submit" className="btn-primary">
          검색
        </button>
      </form>

      <div className="card-cute overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-light text-xs font-pixel">
              <th className="text-left py-2">닉네임</th>
              <th className="text-left">전화번호</th>
              <th className="text-right">플레이</th>
              <th className="text-right">가입일</th>
              <th className="text-center">권한</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const masked = u.phoneNumber.replace(
                /(\d{3})(\d{4})(\d+)/,
                '$1-****-$3'
              );
              return (
                <tr key={u.id} className="border-t border-soft-pink/40">
                  <td className="py-2 font-pixel text-text-dark">
                    {u.nickname}
                  </td>
                  <td className="font-pixel text-text-light">{masked}</td>
                  <td className="text-right font-pixel">{u._count.scores}</td>
                  <td className="text-right font-pixel text-text-light text-xs">
                    {u.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="text-center">
                    {u.isAdmin ? (
                      <span className="text-xs text-primary-pink font-pixel">
                        🛡️ admin
                      </span>
                    ) : (
                      <span className="text-xs text-text-light font-pixel">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2 text-sm font-pixel">
        {Array.from({ length: totalPages }).slice(0, 10).map((_, i) => {
          const p = i + 1;
          const url = `/admin/users?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${p}`;
          return (
            <a
              key={p}
              href={url}
              className={`px-3 py-1 rounded-cute ${
                p === page ? 'bg-primary-pink text-white' : 'bg-white/70 text-text-dark'
              }`}
            >
              {p}
            </a>
          );
        })}
      </div>
    </div>
  );
}
