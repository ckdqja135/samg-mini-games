import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createSession,
  normalizePhoneNumber,
  isValidKoreanPhone,
} from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phoneNumber = normalizePhoneNumber(body.phoneNumber || '');
    const nickname = (body.nickname || '').trim();

    if (!isValidKoreanPhone(phoneNumber)) {
      return NextResponse.json(
        { error: '올바른 전화번호를 입력해주세요 (010-XXXX-XXXX)' },
        { status: 400 }
      );
    }

    if (nickname.length < 2 || nickname.length > 10) {
      return NextResponse.json(
        { error: '닉네임은 2~10자로 입력해주세요' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: '이미 가입된 번호예요. 로그인을 이용해주세요' },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: { phoneNumber, nickname },
    });

    const token = await createSession({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      nickname: user.nickname,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        nickname: user.nickname,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
