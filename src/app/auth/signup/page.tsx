'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { CuteButton } from '@/components/ui/CuteButton';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { useAuthStore } from '@/store/authStore';

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, nickname }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '회원가입에 실패했습니다');
        setSubmitting(false);
        return;
      }

      setUser(data.user);
      router.push('/games');
    } catch {
      setError('네트워크 오류가 발생했습니다');
      setSubmitting(false);
    }
  };

  const isValid =
    phone.replace(/[^0-9]/g, '').length >= 10 && nickname.trim().length >= 2;

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col px-6 py-8">
        <div className="flex items-center mb-6">
          <Link href="/" className="text-text-dark text-xl">←</Link>
          <h1 className="flex-1 text-center font-sans font-bold text-lg text-text-dark tracking-tight">
            회원가입
          </h1>
          <div className="w-6" />
        </div>

        <div className="text-center mt-4 mb-8">
          <h2 className="font-sans font-bold text-2xl text-primary-pink mb-2 tracking-tight">
            처음 오셨군요!
          </h2>
          <p className="text-sm text-text-light leading-relaxed">
            전화번호와 닉네임을 입력하면<br />
            바로 게임을 시작할 수 있어요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-text-dark mb-2 ml-1">
              전화번호
            </label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-dark mb-2 ml-1">
              닉네임 (2~10자)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="별빛핑"
              maxLength={10}
              disabled={submitting}
              className="input-cute text-center"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">
              {error}
            </p>
          )}

          <CuteButton
            type="submit"
            variant="primary"
            fullWidth
            disabled={!isValid || submitting}
          >
            {submitting ? '잠시만요...' : '가입하기'}
          </CuteButton>

          <p className="text-xs text-text-light text-center mt-2">
            이미 계정이 있나요?{' '}
            <Link href="/auth/login" className="text-primary-pink font-bold underline">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </MobileFrame>
  );
}
