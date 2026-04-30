'use client';

import { useRouter } from 'next/navigation';
import { CuteButton } from '@/components/ui/CuteButton';
import { SettingsToggles } from '@/components/ui/SettingsToggles';

interface PauseModalProps {
  open: boolean;
  onResume: () => void;
  onQuit?: () => void;
  gameName?: string;
}

export function PauseModal({ open, onResume, onQuit, gameName }: PauseModalProps) {
  const router = useRouter();
  if (!open) return null;
  const handleQuit = () => {
    onQuit?.();
    router.push('/games');
  };

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-cute-lg"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="card-cute w-[80%] max-w-[320px] flex flex-col gap-3 text-center">
        <h2 className="font-pixel text-xl text-primary-pink">⏸️ 일시정지</h2>
        {gameName && (
          <p className="text-xs text-text-light font-pixel">{gameName}</p>
        )}

        <div className="flex justify-center my-1">
          <SettingsToggles />
        </div>

        <CuteButton variant="primary" fullWidth withSparkle onClick={onResume}>
          ▶ 계속하기
        </CuteButton>
        <CuteButton variant="secondary" fullWidth onClick={handleQuit}>
          🏠 그만두기
        </CuteButton>
      </div>
    </div>
  );
}
