'use client';

import { useState } from 'react';
import { CuteButton } from '@/components/ui/CuteButton';

interface ShareButtonProps {
  gameName: string;
  score: number;
  characterName?: string;
  url?: string;
}

export function ShareButton({ gameName, score, characterName, url }: ShareButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const buildText = () => {
    const charPart = characterName ? `${characterName}으로 ` : '';
    return `🎮 마이핑 컴패니언 [${gameName}]에서 ${charPart}${score.toLocaleString()}점 달성! ✨ 도전해볼래?`;
  };

  const handleShare = async () => {
    const text = buildText();
    const shareUrl =
      url || (typeof window !== 'undefined' ? window.location.origin : '');
    const fullText = `${text}\n${shareUrl}`;

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: '마이핑 컴패니언 미니게임',
          text: fullText,
        });
        setFeedback(null);
        return;
      } catch {
        // 사용자 취소 또는 실패 → 클립보드 폴백
      }
    }

    // 클립보드 폴백
    try {
      await navigator.clipboard.writeText(fullText);
      setFeedback('클립보드에 복사됐어요');
    } catch {
      setFeedback('공유에 실패했어요');
    }
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="relative">
      <CuteButton variant="secondary" fullWidth onClick={handleShare}>
        점수 공유하기
      </CuteButton>
      {feedback && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-cute bg-text-dark text-white text-xs font-sans font-semibold whitespace-nowrap">
          {feedback}
        </div>
      )}
    </div>
  );
}
