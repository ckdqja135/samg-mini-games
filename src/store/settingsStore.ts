'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audio } from '@/lib/audio';
import { setHapticEnabled } from '@/lib/haptic';

interface SettingsState {
  soundMuted: boolean;
  hapticEnabled: boolean;
  hydrated: boolean;
  setSoundMuted: (muted: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundMuted: false,
      hapticEnabled: true,
      hydrated: false,
      setSoundMuted: (muted) => {
        audio.setMuted(muted);
        set({ soundMuted: muted });
      },
      setHapticEnabled: (value) => {
        setHapticEnabled(value);
        set({ hapticEnabled: value });
      },
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: 'samg:settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          audio.setMuted(state.soundMuted);
          setHapticEnabled(state.hapticEnabled);
          state.setHydrated(true);
        }
      },
    }
  )
);
