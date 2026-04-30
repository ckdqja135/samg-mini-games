import Link from 'next/link';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { CuteButton } from '@/components/ui/CuteButton';
import { SparkleEffect } from '@/components/ui/SparkleEffect';

export default function SplashPage() {
  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-12 relative">
        <SparkleEffect count={8} />

        <div className="w-full text-center mt-8 relative z-10">
          <h1 className="font-pixel text-3xl text-primary-pink drop-shadow-[2px_2px_0_rgba(255,255,255,0.9)]">
            ✨ 미니게임천국 ✨
          </h1>
          <p className="mt-3 text-text-dark text-sm">
            마이핑 컴패니언과 함께하는
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center w-full relative z-10">
          <div className="relative">
            <div
              className="w-48 h-48 rounded-full bg-gradient-to-br from-soft-pink to-lavender flex items-center justify-center text-7xl shadow-xl animate-float"
              aria-hidden
            >
              💖
            </div>
            <SparkleEffect count={4} />
          </div>
        </div>

        <div className="w-full text-center relative z-10">
          <p className="font-pixel text-text-dark text-base mb-6 leading-relaxed">
            &ldquo;핑들과 함께하는<br />미니게임 천국!&rdquo;
          </p>

          <Link href="/auth/login" className="block">
            <CuteButton variant="primary" fullWidth withSparkle>
              📱 시작하기
            </CuteButton>
          </Link>

          <p className="mt-4 text-text-light text-xs">
            전화번호와 닉네임만 있으면 OK!
          </p>
        </div>
      </div>
    </MobileFrame>
  );
}
