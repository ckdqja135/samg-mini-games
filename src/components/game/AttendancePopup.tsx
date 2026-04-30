'use client';

import { useEffect, useState } from 'react';
import { CuteButton } from '@/components/ui/CuteButton';
import { Confetti } from '@/components/ui/Confetti';

export function AttendancePopup() {
  const [streak, setStreak] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/daily/checkin', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.isNewToday) {
          setStreak(data.streak);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open || streak === null) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative card-cute w-full max-w-[340px] flex flex-col items-center gap-3 text-center py-6">
        <Confetti count={60} durationMs={2500} />
        <div className="text-5xl">🎉</div>
        <h2 className="font-pixel text-xl text-primary-pink">출석 체크!</h2>
        <p className="font-pixel text-base text-text-dark">
          {streak}일 연속 출석 중이에요
        </p>
        <p className="text-xs text-text-light">
          오늘도 핑들과 함께 즐거운 시간 보내요 💖
        </p>
        <CuteButton variant="primary" fullWidth withSparkle onClick={() => setOpen(false)}>
          알겠어요!
        </CuteButton>
      </div>
    </div>
  );
}
