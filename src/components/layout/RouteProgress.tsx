'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const MIN_VISIBLE_MS = 400;

export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickRef = useRef<number | null>(null);
  const hideRef = useRef<number | null>(null);
  const finishRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const clearTimers = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (hideRef.current) {
      window.clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    if (finishRef.current) {
      window.clearTimeout(finishRef.current);
      finishRef.current = null;
    }
  };

  const start = () => {
    clearTimers();
    startedAtRef.current = performance.now();
    setVisible(true);
    setProgress(30);
    tickRef.current = window.setInterval(() => {
      setProgress((p) => (p < 85 ? p + Math.random() * 6 + 1 : p));
    }, 200);
  };

  const finish = () => {
    const elapsed = performance.now() - startedAtRef.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    finishRef.current = window.setTimeout(() => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setProgress(100);
      hideRef.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }, wait);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (href.startsWith('#')) return;
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (visible) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    return clearTimers;
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-[3px] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-[#FF8FB1] via-[#FFB5D0] to-[#FF8FB1] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow:
            '0 0 10px rgba(255, 143, 177, 0.9), 0 0 4px rgba(255, 143, 177, 1)',
        }}
      />
    </div>
  );
}
