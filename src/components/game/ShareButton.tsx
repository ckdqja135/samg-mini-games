'use client';

import { useState } from 'react';

interface ShareButtonProps {
  gameName: string;
  score: number;
  characterName?: string;
  url?: string;
}

function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function buildShareText(
  gameName: string,
  score: number,
  characterName?: string
): { title: string; description: string } {
  const charPart = characterName ? `${characterName}으로 ` : '';
  return {
    title: `🎮 ${gameName} ${score.toLocaleString()}점!`,
    description: `마이핑 컴패니언에서 ${charPart}${score.toLocaleString()}점 달성! ✨ 너도 도전해볼래?`,
  };
}

export function ShareButton({
  gameName,
  score,
  characterName,
  url,
}: ShareButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleCopy = async () => {
    const origin = getSiteOrigin();
    const shareUrl = url || origin;
    const { title, description } = buildShareText(gameName, score, characterName);
    // 멘트 + 빈 줄 + 링크. 메신저/SNS 어디 붙여넣어도 자연스러운 형태
    const fullText = `${title}\n${description}\n${shareUrl}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
      } else {
        // 폴백 — 구형 브라우저
        const ta = document.createElement('textarea');
        ta.value = fullText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showFeedback('링크 복사 완료!');
    } catch {
      showFeedback('복사에 실패했어요');
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopy}
        className={`
          relative w-full
          flex items-center justify-center gap-1.5
          px-3 py-3 rounded-cute-lg
          bg-white/80 border-2 border-primary-pink/30
          text-text-dark font-sans font-semibold text-sm
          transform transition-all
          active:translate-y-0.5
          hover:bg-white
        `}
        aria-label="공유 멘트와 링크를 클립보드에 복사"
      >
        <CopyIcon />
        <span>점수 공유하기</span>
      </button>

      {feedback && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-cute bg-text-dark text-white text-xs font-sans font-semibold whitespace-nowrap z-10"
          role="status"
          aria-live="polite"
        >
          {feedback}
        </div>
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
