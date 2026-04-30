'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGamePlayStore } from '@/store/gameStore';
import { CharacterRenderer } from '@/utils/CharacterRenderer';
import {
  BALLOON_RIDE_CONFIG,
  generateWall,
  getBalloonItemEmoji,
  getBalloonItemScore,
  levelFromDistance,
  maybeGenerateItem,
  paramsForLevel,
  resetCounters,
} from '@/data/balloonRide';
import type {
  BalloonGameState,
  BalloonItem,
  CloudWall,
} from '@/types/balloonRide';
import type { GameOverResult } from '@/types/cloudJump';
import { AbilityEffectOverlay } from './AbilityEffectOverlay';
import { GameHUD } from './GameHUD';
import { audio } from '@/lib/audio';
import { vibrate } from '@/lib/haptic';

interface BalloonRideGameProps {
  gameId: string;
  characterId: string;
}

const {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRAVITY,
  PUFF_VELOCITY,
  MAX_FALL_SPEED,
  PLAYER_X,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  DISTANCE_TICK_FRAMES,
  GATE_PASS_BONUS,
  TOP_PADDING,
  BOTTOM_PADDING,
} = BALLOON_RIDE_CONFIG;

function createInitialState(): BalloonGameState {
  resetCounters();
  const params = paramsForLevel(1);
  const walls: CloudWall[] = [];
  let x = CANVAS_WIDTH + 60;
  for (let i = 0; i < 4; i++) {
    walls.push(generateWall(x, 1));
    x += params.wallSpacing;
  }
  return {
    player: {
      x: PLAYER_X,
      y: CANVAS_HEIGHT / 2 - PLAYER_HEIGHT / 2,
      vy: 0,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
    },
    walls,
    items: [],
    scrollSpeed: params.scrollSpeed,
    distance: 0,
    level: 1,
    isGameOver: false,
    startedAt: 0,
    spawnRightX: x,
  };
}

function aabbHits(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function BalloonRideGame({
  gameId,
  characterId,
}: BalloonRideGameProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<BalloonGameState>(createInitialState());
  const rendererRef = useRef<CharacterRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const bgGradientRef = useRef<CanvasGradient | null>(null);

  const addScore = useGamePlayStore((s) => s.addScore);
  const resetGame = useGamePlayStore((s) => s.resetGame);
  const setCharacter = useGamePlayStore((s) => s.setCharacter);

  const [hudLevel, setHudLevel] = useState(1);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);

  const gameOverRef = useRef<() => void>(() => {});

  useEffect(() => {
    setCharacter(characterId);
    resetGame();

    const renderer = new CharacterRenderer();
    rendererRef.current = renderer;
    renderer.preload().then(() => setReady(true)).catch(() => setReady(true));

    const wakeAudio = () => {
      void audio.ensure();
    };
    window.addEventListener('pointerdown', wakeAudio, { once: true });
    window.addEventListener('keydown', wakeAudio, { once: true });

    return () => {
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('pointerdown', wakeAudio);
      window.removeEventListener('keydown', wakeAudio);
    };
  }, [characterId, resetGame, setCharacter]);

  useEffect(() => {
    if (!ready) return;
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => {
      setCountdown((c) => (c === null ? null : c - 1));
    }, 700);
    return () => clearTimeout(t);
  }, [countdown, ready]);

  // 메인 루프
  useEffect(() => {
    if (!ready || countdown !== null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    state.player.vy = PUFF_VELOCITY * 0.7;
    startedAtRef.current = performance.now();
    state.startedAt = startedAtRef.current;
    useGamePlayStore.setState({ gameStartTime: startedAtRef.current });
    frameCountRef.current = 0;

    const handleGameOver = () => {
      if (state.isGameOver) return;
      state.isGameOver = true;
      audio.play('gameOver');
      vibrate('fail');

      const store = useGamePlayStore.getState();
      const result: GameOverResult = {
        gameId,
        characterId,
        score: store.currentScore,
        maxCombo: store.maxCombo,
        abilityActivations: store.abilityActivations,
        durationMs: performance.now() - startedAtRef.current,
      };
      try {
        sessionStorage.setItem(
          `samg:lastResult:${gameId}`,
          JSON.stringify(result)
        );
      } catch {
        // ignore
      }
      router.push(`/games/${gameId}/result`);
    };
    gameOverRef.current = handleGameOver;

    const loop = () => {
      const time = performance.now();
      const s = stateRef.current;
      if (s.isGameOver) return;
      frameCountRef.current++;

      // 물리
      s.player.vy = Math.min(s.player.vy + GRAVITY, MAX_FALL_SPEED);
      s.player.y += s.player.vy;

      // 벽/아이템 좌측 스크롤
      s.walls.forEach((w) => (w.x -= s.scrollSpeed));
      s.items.forEach((it) => (it.x -= s.scrollSpeed));
      s.spawnRightX -= s.scrollSpeed;

      // 화면 밖으로 나간 벽 제거 + 새 벽 + 아이템 스폰
      s.walls = s.walls.filter((w) => w.x + w.width > -10);
      const params = paramsForLevel(s.level);
      while (s.walls.length < 4) {
        const lastWall = s.walls[s.walls.length - 1];
        const newX = (lastWall ? lastWall.x : s.spawnRightX) + params.wallSpacing;
        const newWall = generateWall(newX, s.level);
        s.walls.push(newWall);
        if (lastWall) {
          const item = maybeGenerateItem(lastWall, newWall);
          if (item) s.items.push(item);
        }
        s.spawnRightX = newWall.x + newWall.width;
      }
      s.items = s.items.filter((it) => !it.collected && it.x + it.size > -10);

      // 천장/바닥 충돌 → 게임오버
      if (s.player.y < TOP_PADDING) {
        s.player.y = TOP_PADDING;
        s.player.vy = 0;
      }
      if (s.player.y + s.player.height > CANVAS_HEIGHT - BOTTOM_PADDING) {
        handleGameOver();
        return;
      }

      // 벽 충돌
      for (const wall of s.walls) {
        // 위쪽 벽
        const topWall = {
          x: wall.x,
          y: 0,
          w: wall.width,
          h: wall.gapTop,
        };
        const bottomWall = {
          x: wall.x,
          y: wall.gapBottom,
          w: wall.width,
          h: CANVAS_HEIGHT - wall.gapBottom,
        };
        if (
          aabbHits(
            s.player.x,
            s.player.y,
            s.player.width,
            s.player.height,
            topWall.x,
            topWall.y,
            topWall.w,
            topWall.h
          ) ||
          aabbHits(
            s.player.x,
            s.player.y,
            s.player.width,
            s.player.height,
            bottomWall.x,
            bottomWall.y,
            bottomWall.w,
            bottomWall.h
          )
        ) {
          handleGameOver();
          return;
        }

        // 게이트 통과 보너스
        if (!wall.passed && wall.x + wall.width < s.player.x) {
          wall.passed = true;
          addScore(GATE_PASS_BONUS, { isItemBonus: false });
          audio.play('combo');
          vibrate('combo');
        }
      }

      // 아이템 충돌
      for (const item of s.items) {
        if (item.collected) continue;
        if (
          aabbHits(
            s.player.x,
            s.player.y,
            s.player.width,
            s.player.height,
            item.x,
            item.y,
            item.size,
            item.size
          )
        ) {
          item.collected = true;
          addScore(getBalloonItemScore(item.type), { isItemBonus: true });
          audio.play('fruit');
          vibrate('light');
        }
      }

      // 거리 점수 + 레벨업
      if (frameCountRef.current % DISTANCE_TICK_FRAMES === 0) {
        s.distance += 1;
        addScore(1, { passive: true });
        const newLevel = levelFromDistance(s.distance);
        if (newLevel !== s.level) {
          s.level = newLevel;
          const p = paramsForLevel(newLevel);
          s.scrollSpeed = p.scrollSpeed;
          setHudLevel(newLevel);
        }
      }

      drawScene(ctx, s, time);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [ready, countdown, addScore, characterId, gameId, router]);

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    s: BalloonGameState,
    time: number
  ) => {
    if (!bgGradientRef.current) {
      const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      g.addColorStop(0, '#C5E5FF');
      g.addColorStop(0.6, '#FFE0EC');
      g.addColorStop(1, '#FFF5E0');
      bgGradientRef.current = g;
    }
    ctx.fillStyle = bgGradientRef.current;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 배경 시차 별
    const parallax = (time / 80) % 80;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 12; i++) {
      const px = ((i * 53 - parallax) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      const py = (i * 47) % CANVAS_HEIGHT;
      ctx.beginPath();
      ctx.arc(px, py, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 벽 (위/아래 구름 형태)
    s.walls.forEach((wall) => drawWall(ctx, wall));

    // 아이템
    s.items.forEach((item) => drawItem(ctx, item, time));

    // 풍선 + 캐릭터
    drawBalloonAndCharacter(ctx, s, time);
  };

  const drawWall = (ctx: CanvasRenderingContext2D, wall: CloudWall) => {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = 'rgba(74, 59, 82, 0.25)';
    ctx.lineWidth = 1.5;

    const drawCloudRect = (x: number, y: number, w: number, h: number) => {
      ctx.beginPath();
      const r = 14;
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.fill();
      ctx.stroke();
    };

    // 위쪽 벽
    if (wall.gapTop > 0) {
      drawCloudRect(wall.x, -10, wall.width, wall.gapTop + 10);
    }
    // 아래쪽 벽
    if (wall.gapBottom < CANVAS_HEIGHT) {
      drawCloudRect(
        wall.x,
        wall.gapBottom,
        wall.width,
        CANVAS_HEIGHT - wall.gapBottom + 10
      );
    }

    // 갭 안쪽 가장자리 살짝 강조 (들어가는 입구 느낌)
    ctx.strokeStyle = 'rgba(255, 143, 177, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wall.x, wall.gapTop);
    ctx.lineTo(wall.x + wall.width, wall.gapTop);
    ctx.moveTo(wall.x, wall.gapBottom);
    ctx.lineTo(wall.x + wall.width, wall.gapBottom);
    ctx.stroke();

    ctx.restore();
  };

  const drawItem = (
    ctx: CanvasRenderingContext2D,
    item: BalloonItem,
    time: number
  ) => {
    if (item.collected) return;
    const bob = Math.sin(time / 350 + item.spawnPhase) * 3;
    const cx = item.x + item.size / 2;
    const cy = item.y + item.size / 2 + bob;

    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, item.size * 0.9);
    glow.addColorStop(0, 'rgba(255, 232, 154, 0.55)');
    glow.addColorStop(1, 'rgba(255, 232, 154, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, item.size * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${item.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getBalloonItemEmoji(item.type), cx, cy);
    ctx.restore();
  };

  const drawBalloonAndCharacter = (
    ctx: CanvasRenderingContext2D,
    s: BalloonGameState,
    time: number
  ) => {
    // 풍선 (캐릭터 머리 위)
    const balloonCenterX = s.player.x + s.player.width / 2;
    const balloonCenterY = s.player.y - 22;
    const balloonR = 22;

    // 풍선 끈
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 59, 82, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(balloonCenterX, balloonCenterY + balloonR);
    ctx.lineTo(s.player.x + s.player.width / 2, s.player.y + 4);
    ctx.stroke();

    // 풍선 본체
    const grad = ctx.createRadialGradient(
      balloonCenterX - 6,
      balloonCenterY - 6,
      2,
      balloonCenterX,
      balloonCenterY,
      balloonR
    );
    grad.addColorStop(0, '#FFB5D0');
    grad.addColorStop(1, '#FF6B92');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(
      balloonCenterX,
      balloonCenterY,
      balloonR,
      balloonR + 4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.strokeStyle = 'rgba(230, 107, 146, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 풍선 매듭
    ctx.fillStyle = '#E66B92';
    ctx.beginPath();
    ctx.moveTo(balloonCenterX - 4, balloonCenterY + balloonR + 2);
    ctx.lineTo(balloonCenterX + 4, balloonCenterY + balloonR + 2);
    ctx.lineTo(balloonCenterX, balloonCenterY + balloonR + 7);
    ctx.fill();

    // 하이라이트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(
      balloonCenterX - 7,
      balloonCenterY - 9,
      4,
      6,
      -0.4,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // 캐릭터: vy 기준 jump/idle/hurt
    let anim: 'idle' | 'jump' | 'walk' | 'hurt' = 'idle';
    if (s.player.vy < -2) anim = 'jump';
    else if (s.player.vy > 5) anim = 'hurt';

    const renderer = rendererRef.current;
    if (renderer) {
      renderer.draw(
        ctx,
        characterId,
        s.player.x,
        s.player.y,
        s.player.height,
        anim,
        time,
        false
      );
    } else {
      ctx.fillStyle = '#FF8FB1';
      ctx.beginPath();
      ctx.arc(
        s.player.x + s.player.width / 2,
        s.player.y + s.player.height / 2,
        s.player.width / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  };

  const puff = () => {
    const s = stateRef.current;
    if (s.isGameOver) return;
    s.player.vy = PUFF_VELOCITY;
    audio.play('jump');
    vibrate('light');
  };

  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    puff();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) puff();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-cream select-none">
      <GameHUD level={hudLevel} onMenu={() => router.push('/games')} />

      <div
        className="relative mt-12"
        onTouchStart={handleTap}
        onMouseDown={handleTap}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="rounded-cute-lg shadow-xl bg-white"
          style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            maxWidth: '100%',
            touchAction: 'none',
          }}
        />

        <AbilityEffectOverlay />

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-cute-lg">
            <div className="font-pixel text-7xl text-white drop-shadow-[3px_3px_0_#FF8FB1]">
              {countdown === 0 ? 'GO!' : countdown}
            </div>
          </div>
        )}

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-cream/90 rounded-cute-lg">
            <p className="font-pixel text-text-dark">준비 중...</p>
          </div>
        )}
      </div>

      <div className="mt-3 text-center text-xs text-text-light font-pixel">
        터치 / 스페이스바로 풍선 띄우기
      </div>
    </div>
  );
}
