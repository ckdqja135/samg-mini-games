'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { audio } from '@/lib/audio';

interface SettingsTogglesProps {
  className?: string;
  compact?: boolean;
}

export function SettingsToggles({
  className = '',
  compact = false,
}: SettingsTogglesProps) {
  const soundMuted = useSettingsStore((s) => s.soundMuted);
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const setSoundMuted = useSettingsStore((s) => s.setSoundMuted);
  const setHaptic = useSettingsStore((s) => s.setHapticEnabled);

  // hydration 직후 한 번 동기화 (스토어 onRehydrate 외 안전망)
  useEffect(() => {
    audio.setMuted(soundMuted);
  }, [soundMuted]);

  if (!hydrated) {
    return <div className={`flex gap-1 ${className}`} aria-hidden />;
  }

  const btn = (active: boolean, onClick: () => void, icon: string, label: string) => (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`
        ${compact ? 'w-8 h-8 text-base' : 'w-9 h-9 text-lg'}
        rounded-full
        ${active ? 'bg-white/90 text-text-dark' : 'bg-white/40 text-text-light line-through'}
        shadow-sm hover:scale-105 transition-transform
        flex items-center justify-center
      `}
    >
      {icon}
    </button>
  );

  return (
    <div className={`flex gap-1.5 ${className}`}>
      {btn(!soundMuted, () => setSoundMuted(!soundMuted), soundMuted ? '🔇' : '🔊', '소리 토글')}
      {btn(hapticEnabled, () => setHaptic(!hapticEnabled), '📳', '진동 토글')}
    </div>
  );
}
