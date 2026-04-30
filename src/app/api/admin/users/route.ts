import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = 30;
  const search = (url.searchParams.get('q') || '').trim();

  const where = search
    ? {
        OR: [
          { nickname: { contains: search } },
          { phoneNumber: { contains: search } },
        ],
      }
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

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      phoneNumber: u.phoneNumber.replace(
        /(\d{3})(\d{4})(\d+)/,
        '$1-****-$3'
      ),
      isAdmin: u.isAdmin,
      createdAt: u.createdAt.toISOString(),
      plays: u._count.scores,
    })),
    page,
    pageSize,
    total,
  });
}
