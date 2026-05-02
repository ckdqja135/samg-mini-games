'use client';

import { useEffect, useState } from 'react';
import { useGamePlayStore } from '@/store/gameStore';
import { CHARACTER_ABILITIES } from '@/data/characterAbilities';
import { CHARACTER_SPRITES } from '@/data/characterSprite';

/**
 * 게임 화면 좌측 상단에 활성 능력 상태를 표시:
 * - 포실핑: 30초 카운트다운 바
 * - 그 외: 능력 아이콘 + 다음 발동 카운트 표시
 */
export function AbilityIndicator() {
  const characterId = useGamePlayStore((s) => s.selectedCharacter);
  const comboCount = useGamePlayStore((s) => s.comboCount);
  const gameStartTime = useGamePlayStore((s) => s.gameStartTime);
  const [now, setNow] = useState(performance.now());

  useEffect(() => {
    if (!characterId) return;
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [characterId]);

  if (!characterId) return null;
  const ability = CHARACTER_ABILITIES[characterId];
  const char = CHARACTER_SPRITES.find((c) => c.id === characterId);
  if (!ability || !char) return null;

  const elapsedMs = gameStartTime > 0 ? now - gameStartTime : 0;

  let body: React.ReactNode = null;

  if (ability.effect.type === 'time_bonus') {
    // 포실핑: 30초 동안 점수 2배
    const totalMs = (ability.effect.trigger?.threshold ?? 30) * 1000;
    const remainMs = Math.max(0, totalMs - elapsedMs);
    const progress = Math.max(0, Math.min(1, remainMs / totalMs));
    if (remainMs > 0) {
      body = (
        <div className="flex flex-col items-center gap-0.5 min-w-[88px]">
          <div className="flex items-center gap-1">
            <span className="text-sm">{ability.iconEmoji}</span>
            <span className="text-[11px] font-sans font-bold text-text-dark tabular-nums">
              점수 ×{ability.effect.baseValue}
            </span>
            <span className="text-[10px] font-sans text-text-light tabular-nums">
              {Math.ceil(remainMs / 1000)}초
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${progress * 100}%`,
                background: char.color,
              }}
            />
          </div>
        </div>
      );
    } else {
      body = (
        <div className="flex items-center gap-1 opacity-50">
          <span className="text-sm">{ability.iconEmoji}</span>
          <span className="text-[10px] font-sans text-text-light">종료</span>
        </div>
      );
    }
  } else if (ability.effect.type === 'combo_bonus') {
    // 하츄핑: 5콤보당, 새콤핑: 10콤보당
    const interval = ability.effect.trigger?.every ?? 5;
    const filled = comboCount % interval;
    const progress = filled / interval;
    body = (
      <div className="flex flex-col items-stretch gap-1 min-w-[110px]">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-sm leading-none">{ability.iconEmoji}</span>
            <span className="text-[11px] font-sans font-bold text-text-dark">
              +{ability.effect.baseValue}점
            </span>
          </div>
          <span className="text-[10px] font-sans font-bold text-text-light tabular-nums">
            {filled}/{interval}
          </span>
        </div>
        <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${progress * 100}%`,
              background: char.color,
            }}
          />
        </div>
      </div>
    );
  } else if (ability.effect.type === 'event_bonus') {
    // 샤샤핑
    body = (
      <div className="flex items-center gap-1">
        <span className="animate-pulse text-sm">{ability.iconEmoji}</span>
        <span className="text-[11px] font-sans font-bold text-text-dark tabular-nums">
          아이템 ×{ability.effect.baseValue}
        </span>
      </div>
    );
  } else {
    // 달콤핑
    body = (
      <div className="flex items-center gap-1">
        <span className="text-sm">{ability.iconEmoji}</span>
        <span className="text-[11px] font-sans font-bold text-text-dark tabular-nums">
          전체 점수 +{Math.round((ability.effect.baseValue - 1) * 100)}%
        </span>
      </div>
    );
  }

  return (
    <div className="absolute left-3 top-14 z-20 pointer-events-none px-2 py-1 rounded-cute bg-white/85 backdrop-blur-sm shadow-sm">
      {body}
    </div>
  );
}
