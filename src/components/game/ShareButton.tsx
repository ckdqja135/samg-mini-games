'use client';

import { useEffect, useState } from 'react';
import { isKakaoConfigured, loadKakao } from '@/lib/kakao';

interface ShareButtonProps {
  gameName: string;
  score: number;
  characterName?: string;
  url?: string;
}

const OG_IMAGE_PATH = '/asset/teeniping.png';
const OG_IMAGE_WIDTH = 800;
const OG_IMAGE_HEIGHT = 400;

function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

// 카카오 공유 멘트와 동일한 문구 — 클립보드 복사도 같은 텍스트를 사용해 UX 일관성 유지
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
  const [ready, setReady] = useState(false);

  // 마운트 시 SDK prefetch — 클릭 지연 최소화
  useEffect(() => {
    if (!isKakaoConfigured()) return;
    loadKakao()
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleShare = async () => {
    if (!isKakaoConfigured()) {
      showFeedback('카카오 키가 설정되지 않았어요');
      return;
    }

    try {
      await loadKakao();
    } catch {
      showFeedback('카카오 SDK 로드 실패');
      return;
    }

    if (!window.Kakao?.Share) {
      showFeedback('카카오 공유를 사용할 수 없어요');
      return;
    }

    const origin = getSiteOrigin();
    const shareUrl = url || origin;
    const { title, description } = buildShareText(gameName, score, characterName);

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description,
          imageUrl: `${origin}${OG_IMAGE_PATH}`,
          imageWidth: OG_IMAGE_WIDTH,
          imageHeight: OG_IMAGE_HEIGHT,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '나도 도전하기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
    } catch {
      showFeedback('공유에 실패했어요');
    }
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
      <div className="grid grid-cols-2 gap-2">
        {/* 카카오톡 공유 (메인) */}
        <button
          type="button"
          onClick={handleShare}
          disabled={!ready}
          className={`
            relative w-full
            flex items-center justify-center gap-1.5
            px-3 py-3 rounded-cute-lg
            bg-[#FEE500] text-[#181600] font-bold text-sm
            shadow-cute
            transform transition-all
            active:translate-y-1 active:shadow-none
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label="카카오톡으로 점수 공유하기"
        >
          <KakaoIcon />
          <span>카카오톡 공유</span>
        </button>

        {/* 멘트 + 링크 클립보드 복사 (보조) */}
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
          <span>링크 복사</span>
        </button>
      </div>

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

function KakaoIcon() {
  // 카카오톡 말풍선 심볼 (단색)
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.81 1.87 5.27 4.7 6.66l-1.04 3.8c-.1.36.31.65.62.45l4.55-3.01c.39.04.78.06 1.17.06 5.523 0 10-3.477 10-7.96S17.523 3 12 3Z" />
    </svg>
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
