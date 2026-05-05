'use client';

import { useEffect, useState } from 'react';
import { CuteButton } from '@/components/ui/CuteButton';

export interface Tutorial {
  emoji: string;
  title: string;
  steps: string[];
}

export const TUTORIALS: Record<string, Tutorial> = {
  'cloud-jump': {
    emoji: '☁️',
    title: '포실핑의 구름 점프',
    steps: [
      '캐릭터가 자동으로 좌우로 이동해요',
      '탭/스페이스바 = 방향 전환',
      '구름을 밟으면 자동으로 점프!',
      '🌸 트램폴린(분홍)은 더 높이 점프',
      '⭐ 별 구름은 보너스 점수',
    ],
  },
  'balloon-ride': {
    emoji: '🎈',
    title: '방글핑의 풍선 여행',
    steps: [
      '풍선이 중력으로 떨어져요',
      '탭/스페이스바 = 풍선 띄우기',
      '구름 벽 사이의 갭을 통과!',
      '벽 통과 시 보너스 + 콤보',
      '🍓🍒🍋🍇💖 과일/하트 수집',
    ],
  },
  'water-dodge': {
    emoji: '💧',
    title: '꽁꽁핑의 물줄기 피하기',
    steps: [
      '캐릭터가 자동으로 좌우로 이동해요',
      '탭/스페이스바 = 방향 전환',
      '하늘에서 떨어지는 물줄기 회피',
      '안전히 통과하면 콤보 +',
      '🍓🍒🍋🍇 과일 수집 시 추가 점수',
    ],
  },
  'cake-catch': {
    emoji: '🍰',
    title: '달콤핑의 디저트 파티',
    steps: [
      '캐릭터가 자동으로 좌우로 이동해요',
      '탭/스페이스바 = 방향 전환',
      '🍰🍩🍬⭐ 디저트가 하늘에서 떨어져요 — 받기',
      '🍓🍒🍋🍇 보너스 과일도 가끔 떨어져요',
      '💣 폭탄에 닿으면 즉시 게임오버!',
    ],
  },
  'balloon-pop': {
    emoji: '🎯',
    title: '큐핑의 풍선 펑펑',
    steps: [
      '캐릭터는 가운데 고정',
      '풍선이 사방에서 다가와요',
      '쏠 방향을 탭(클릭)하면 별이 그쪽으로 날아가요',
      '풍선 궤적을 예측해서 조준!',
      '풍선이 닿으면 게임오버',
    ],
  },
  'star-ladder': {
    emoji: '🪜',
    title: '샤샤핑의 별빛 사다리',
    steps: [
      '두 사다리 중 한 곳에서 등반',
      '탭/스페이스바 = 좌우 사다리 전환',
      '⭐ 별/🍓 과일 = 점수',
      '☄️ 운석 = 게임오버 (피하세요!)',
      '활성 사다리는 노란 테두리',
    ],
  },
  'fruit-river': {
    emoji: '🌊',
    title: '새콤핑의 과일 강물',
    steps: [
      '강물에서 보드를 타고 자동 전진',
      '탭/스페이스바 = 점프',
      '바위 회피 + 공중 과일 수집',
      '바위와 충돌하면 게임오버',
      '🍓🍒🍋🍇 점프해서 캐치!',
    ],
  },
};

interface TutorialOverlayProps {
  gameId: string;
  onShow?: () => void;
  onDismiss: () => void;
}

export function TutorialOverlay({ gameId, onShow, onDismiss }: TutorialOverlayProps) {
  const [shown, setShown] = useState(true);

  useEffect(() => {
    setShown(true);
    onShow?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const handleClose = () => {
    setShown(false);
    onDismiss();
  };

  if (!shown) return null;
  const t = TUTORIALS[gameId];
  if (!t) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm rounded-cute-lg"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="card-cute w-[85%] max-w-[340px] flex flex-col gap-3 text-center">
        <div className="text-5xl">{t.emoji}</div>
        <h2 className="font-pixel text-xl text-primary-pink">{t.title}</h2>
        <ul className="flex flex-col gap-2 text-left">
          {t.steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-text-dark font-pixel"
            >
              <span className="text-primary-pink">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <CuteButton variant="primary" fullWidth withSparkle onClick={handleClose}>
          알겠어요! 시작
        </CuteButton>
      </div>
    </div>
  );
}
