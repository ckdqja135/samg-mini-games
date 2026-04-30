import 'server-only';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  SessionPayload,
  verifySession,
} from './auth';

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Admin 권한 검증. session 있고 user.isAdmin=true 일 때만 통과. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return session;
}

export async function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE_NAME);
}
