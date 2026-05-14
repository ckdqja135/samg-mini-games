'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 개발자도구 단축키 + 우클릭 차단 — "가벼운 허들"이지 진짜 방어막이 아님.
 * 실제 점수 어뷰징 차단은 서버 측 HMAC 세션 토큰 + 이벤트 검증이 담당.
 *
 * 차단 대상:
 * - F12
 * - Ctrl/Cmd+Shift+I / J / C  (Chrome·Edge·Firefox 개발자도구/콘솔/인스펙터)
 * - Cmd+Opt+I / J / C         (Safari 개발자도구)
 * - Ctrl/Cmd+U                (페이지 소스 보기)
 * - 우클릭 (contextmenu)
 *
 * 제외 조건:
 * - 개발 환경(NODE_ENV !== 'production') — 로컬 디버깅 가능하도록
 * - /admin 경로 — 관리자는 정상 작업 필요
 */
export function DevToolsGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (pathname?.startsWith('/admin')) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd+Shift+(I|J|C)  또는  Cmd+Opt+(I|J|C)
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey)) {
        const k = e.key.toLowerCase();
        if (k === 'i' || k === 'j' || k === 'c') {
          e.preventDefault();
          return;
        }
      }

      // Ctrl/Cmd+U
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === 'u'
      ) {
        e.preventDefault();
        return;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [pathname]);

  return null;
}
