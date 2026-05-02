import Link from 'next/link';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { CuteButton } from '@/components/ui/CuteButton';
import { SparkleEffect } from '@/components/ui/SparkleEffect';
import { SettingsToggles } from '@/components/ui/SettingsToggles';

export default function SplashPage() {
  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-12 relative">
        <SparkleEffect count={8} />

        <SettingsToggles className="absolute top-4 right-4 z-20" compact />

        <div className="w-full text-center mt-8 relative z-10">
          <h1 className="font-sans font-extrabold text-4xl text-primary-pink drop-shadow-[2px_2px_0_rgba(255,255,255,0.9)] tracking-tight">
            티니게임천국
          </h1>
          <p className="mt-3 text-text-dark text-sm font-sans font-medium">
            귀여운 미니핑이 함께해요
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
          <div className="flex flex-col gap-3">
            <Link href="/auth/login" className="block">
              <CuteButton variant="primary" fullWidth>
                로그인
              </CuteButton>
            </Link>
            <Link href="/auth/signup" className="block">
              <CuteButton variant="secondary" fullWidth>
                회원가입
              </CuteButton>
            </Link>
          </div>

          <p className="mt-4 text-text-light text-xs font-sans">
            전화번호와 닉네임만 있으면 OK
          </p>
        </div>
      </div>
    </MobileFrame>
  );
}
