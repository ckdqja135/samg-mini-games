'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { CuteButton } from '@/components/ui/CuteButton';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '로그인에 실패했습니다');
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

  const isValid = phone.replace(/[^0-9]/g, '').length >= 10;

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col px-6 py-8">
        <div className="flex items-center mb-6">
          <Link href="/" className="text-text-dark text-xl">←</Link>
          <h1 className="flex-1 text-center font-sans font-bold text-lg text-text-dark tracking-tight">
            로그인
          </h1>
          <div className="w-6" />
        </div>

        <div className="text-center mt-4 mb-8">
          <h2 className="font-sans font-bold text-2xl text-primary-pink mb-2 tracking-tight">
            다시 만나서 반가워요!
          </h2>
          <p className="text-sm text-text-light leading-relaxed">
            가입한 전화번호로<br />
            다시 시작해볼까요?
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
            {submitting ? '잠시만요...' : '로그인'}
          </CuteButton>

          <p className="text-xs text-text-light text-center mt-2">
            아직 계정이 없나요?{' '}
            <Link href="/auth/signup" className="text-primary-pink font-bold underline">
              회원가입
            </Link>
          </p>
        </form>
      </div>
    </MobileFrame>
  );
}
