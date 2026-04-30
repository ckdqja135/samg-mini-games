import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-me-in-production-please-32'
);

const TOKEN_EXPIRY = '30d';

export const SESSION_COOKIE_NAME = 'samg_session';

export interface SessionPayload {
  userId: string;
  phoneNumber: string;
  nickname: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      phoneNumber: payload.phoneNumber as string,
      nickname: payload.nickname as string,
    };
  } catch {
    return null;
  }
}

export function normalizePhoneNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

export function formatPhoneNumber(digits: string): string {
  const d = digits.replace(/[^0-9]/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function isValidKoreanPhone(digits: string): boolean {
  return /^010\d{7,8}$/.test(digits);
}
