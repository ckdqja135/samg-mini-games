'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={busy}
      className="text-xs font-sans font-semibold text-text-light hover:text-primary-pink px-2 py-1 disabled:opacity-50"
      aria-label="로그아웃"
    >
      로그아웃
    </button>
  );
}
