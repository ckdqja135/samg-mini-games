'use client';

import { useGamePlayStore } from '@/store/gameStore';

interface GameHUDProps {
  level: number;
  onMenu?: () => void;
}

export function GameHUD({ level, onMenu }: GameHUDProps) {
  const currentScore = useGamePlayStore((s) => s.currentScore);
  const maxCombo = useGamePlayStore((s) => s.maxCombo);

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-20 px-3 py-2 flex items-start justify-between bg-gradient-to-b from-cream/90 to-transparent pointer-events-none">
        <button
          onClick={onMenu}
          className="font-sans font-bold text-xs text-text-dark bg-white/80 px-3 py-1.5 rounded-cute pointer-events-auto"
        >
          일시정지
        </button>

        <div className="text-right font-sans">
          <div className="text-xs text-text-light leading-none tabular-nums">
            Lv {level}
          </div>
          <div className="text-xs font-bold text-text-dark mt-0.5 tabular-nums">
            최고 콤보 {maxCombo}
          </div>
        </div>
      </div>

      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="px-5 py-1.5 rounded-full bg-white/85 backdrop-blur-sm shadow-[0_3px_0_rgba(230,107,146,0.4)] border-2 border-primary-pink text-center font-sans">
          <div className="text-[10px] font-semibold text-text-light leading-none tracking-widest">
            SCORE
          </div>
          <div
            className="text-2xl font-extrabold leading-tight tabular-nums"
            style={{
              color: '#E66B92',
              textShadow: '1px 1px 0 #FFFFFF',
            }}
          >
            {currentScore.toLocaleString()}
          </div>
        </div>
      </div>
    </>
  );
}
