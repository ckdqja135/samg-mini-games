import Link from 'next/link';
import { CuteButton } from '@/components/ui/CuteButton';
import { MobileFrame } from '@/components/layout/MobileFrame';

export default function NotFound() {
  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
        <div className="text-7xl">🔍</div>
        <h1 className="font-pixel text-3xl text-primary-pink">404</h1>
        <p className="font-pixel text-base text-text-dark">
          여기는 핑들이 없어요
        </p>
        <p className="text-sm text-text-light">
          찾으시는 페이지를 발견하지 못했어요.<br />
          주소를 다시 확인해주세요.
        </p>
        <Link href="/games" className="block w-full mt-4">
          <CuteButton variant="primary" fullWidth withSparkle>
            🎮 게임 선택으로
          </CuteButton>
        </Link>
        <Link href="/" className="text-xs text-text-light underline font-pixel">
          홈으로 돌아가기
        </Link>
      </div>
    </MobileFrame>
  );
}
