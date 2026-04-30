'use client';

import { useEffect } from 'react';
import { CuteButton } from '@/components/ui/CuteButton';
import { MobileFrame } from '@/components/layout/MobileFrame';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
        <div className="text-6xl">😢</div>
        <h1 className="font-pixel text-xl text-primary-pink">
          어머! 문제가 생겼어요
        </h1>
        <p className="text-sm text-text-light leading-relaxed">
          예상치 못한 오류가 발생했어요.<br />
          다시 시도해보세요.
        </p>
        {error.message && (
          <code className="block text-xs text-text-light bg-white/60 px-3 py-2 rounded-cute font-mono break-all max-w-full">
            {error.message}
          </code>
        )}
        <CuteButton variant="primary" fullWidth withSparkle onClick={reset}>
          🔄 다시 시도
        </CuteButton>
        <a href="/" className="text-xs text-text-light underline font-pixel">
          홈으로 돌아가기
        </a>
      </div>
    </MobileFrame>
  );
}
