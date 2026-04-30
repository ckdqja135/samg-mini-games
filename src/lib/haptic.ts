'use client';

export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'fail'
  | 'combo';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 18,
  heavy: 35,
  success: [10, 30, 12],
  fail: [40, 60, 80],
  combo: [6, 20, 6],
};

let enabled = true;

export function setHapticEnabled(value: boolean) {
  enabled = value;
}

export function vibrate(pattern: HapticPattern) {
  if (!enabled) return;
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // ignore
  }
}
