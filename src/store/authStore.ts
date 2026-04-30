'use client';

import { create } from 'zustand';

interface AuthUser {
  id: string;
  phoneNumber: string;
  nickname: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    set({ user: null });
  },
  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user });
      } else {
        set({ user: null });
      }
    } catch {
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));
