'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGamePlayStore } from '@/store/gameStore';
import { CharacterRenderer } from '@/utils/CharacterRenderer';
import { distSq, nextId, randRange } from '@/lib/gameUtils';
import type { GameOverResult } from '@/types/game';
import { AbilityEffectOverlay } from './AbilityEffectOverlay';
import { GameHUD } from './GameHUD';
import { PauseModal } from './PauseModal';
import { TutorialOverlay } from './TutorialOverlay';
import { AbilityIndicator } from './AbilityIndicator';
import { audio } from '@/lib/audio';
import { vibrate } from '@/lib/haptic';

interface Props {
  gameId: string;
  characterId: string;
}

const CFG = {
  W: 375,
  H: 700,
  PLAYER_X: 375 / 2,
  PLAYER_Y: 700 / 2,
  PLAYER_SAFE_R: 38,
  BALLOON_R: 22,
  BALLOON_BASE_SPEED: 0.9,
  BALLOON_MAX_SPEED: 2.3,
  STAR_SPEED: 9,
  STAR_RADIUS: 12,
  SPAWN_INTERVAL_BASE: 50,
  SPAWN_INTERVAL_MIN: 16,
  FIRE_COOLDOWN_MS: 120,
};

const BALLOON_COLORS = ['#FF8FB1', '#FFE89A', '#B5E8D5', '#C5E5FF', '#E8D5F2'];

interface Balloon {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  popped: boolean;
  popAt?: number;
}

interface Star {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId: number;
  done: boolean;
}

export function BalloonPopGame({ gameId, characterId }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CharacterRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const frameRef = useRef(0);
  const bgRef = useRef<CanvasGradient | null>(null);

  const stateRef = useRef({
    balloons: [] as Balloon[],
    stars: [] as Star[],
    nextSpawn: 30,
    distance: 0,
    isOver: false,
    level: 1,
    lastFireAt: 0,
  });

  const addScore = useGamePlayStore((s) => s.addScore);
  const resetGame = useGamePlayStore((s) => s.resetGame);
  const setCharacter = useGamePlayStore((s) => s.setCharacter);
  const startSession = useGamePlayStore((s) => s.startSession);

  const [hudLevel, setHudLevel] = useState(1);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    setCharacter(characterId);
    resetGame();
    void startSession(gameId, characterId);
    const r = new CharacterRenderer();
    rendererRef.current = r;
    r.preload().then(() => setReady(true)).catch(() => setReady(true));
    const wakeAudio = () => void audio.ensure();
    window.addEventListener('pointerdown', wakeAudio, { once: true });
    window.addEventListener('keydown', wakeAudio, { once: true });
    return () => {
      if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('pointerdown', wakeAudio);
      window.removeEventListener('keydown', wakeAudio);
    };
  }, [characterId, gameId, resetGame, setCharacter, startSession]);

  useEffect(() => {
    if (!ready || countdown === null || tutorialOpen) return;
    if (countdown <= 0) {
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 700);
    return () => clearTimeout(t);
  }, [countdown, ready, tutorialOpen]);

  useEffect(() => {
    if (!ready || countdown !== null || tutorialOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    startedAtRef.current = performance.now();
    useGamePlayStore.setState({ gameStartTime: startedAtRef.current });
    frameRef.current = 0;

    const handleGameOver = () => {
      const s = stateRef.current;
      if (s.isOver) return;
      s.isOver = true;
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
        sessionToken: store.sessionToken,
        events: store.scoreEvents,
        untrustedInputs: store.untrustedInputs,
        totalInputs: store.totalInputs,
      };
      try {
        sessionStorage.setItem(`samg:lastResult:${gameId}`, JSON.stringify(result));
      } catch {}
      router.push(`/games/${gameId}/result`);
    };

    const spawnBalloon = (level: number) => {
      // 4면 중 한 곳에서 스폰
      const side = Math.floor(Math.random() * 4);
      let x = 0;
      let y = 0;
      switch (side) {
        case 0:
          x = randRange(20, CFG.W - 20);
          y = -CFG.BALLOON_R;
          break;
        case 1:
          x = CFG.W + CFG.BALLOON_R;
          y = randRange(20, CFG.H - 20);
          break;
        case 2:
          x = randRange(20, CFG.W - 20);
          y = CFG.H + CFG.BALLOON_R;
          break;
        case 3:
          x = -CFG.BALLOON_R;
          y = randRange(20, CFG.H - 20);
          break;
      }
      const dx = CFG.PLAYER_X - x;
      const dy = CFG.PLAYER_Y - y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const speed = Math.min(
        CFG.BALLOON_MAX_SPEED,
        CFG.BALLOON_BASE_SPEED + level * 0.32
      );
      stateRef.current.balloons.push({
        id: nextId(),
        x,
        y,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        popped: false,
      });
    };

    const loop = () => {
      const s = stateRef.current;
      if (s.isOver) return;
      if (pausedRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }
      frameRef.current++;

      // 스폰
      s.nextSpawn--;
      if (s.nextSpawn <= 0) {
        spawnBalloon(s.level);
        const interval = Math.max(
          CFG.SPAWN_INTERVAL_MIN,
          CFG.SPAWN_INTERVAL_BASE - s.level * 10
        );
        s.nextSpawn = interval + Math.floor(Math.random() * 16);
      }

      // 풍선 이동 + 충돌
      for (const b of s.balloons) {
        if (b.popped) continue;
        b.x += b.vx;
        b.y += b.vy;
        if (
          distSq(b.x, b.y, CFG.PLAYER_X, CFG.PLAYER_Y) <
          (CFG.PLAYER_SAFE_R + CFG.BALLOON_R) ** 2
        ) {
          handleGameOver();
          return;
        }
      }

      // 별 이동 + 풍선 명중
      for (const star of s.stars) {
        if (star.done) continue;
        star.x += star.vx;
        star.y += star.vy;
        // 화면 밖 → 제거
        if (
          star.x < -30 ||
          star.x > CFG.W + 30 ||
          star.y < -30 ||
          star.y > CFG.H + 30
        ) {
          star.done = true;
          continue;
        }
        // 충돌 체크
        for (const b of s.balloons) {
          if (b.popped) continue;
          if (
            distSq(star.x, star.y, b.x, b.y) <
            (CFG.STAR_RADIUS + CFG.BALLOON_R) ** 2
          ) {
            b.popped = true;
            b.popAt = performance.now();
            star.done = true;
            addScore(40, { isItemBonus: true });
            audio.play('star');
            vibrate('light');
            break;
          }
        }
      }

      // 정리
      const now = performance.now();
      s.balloons = s.balloons.filter(
        (b) => !b.popped || (b.popAt !== undefined && now - b.popAt < 280)
      );
      s.stars = s.stars.filter((st) => !st.done);

      // 거리 점수 + 레벨업
      if (frameRef.current % 30 === 0) {
        s.distance += 1;
        addScore(1, { passive: true });
        const lv = s.distance < 20 ? 1 : s.distance < 50 ? 2 : s.distance < 100 ? 3 : 4;
        if (lv !== s.level) {
          s.level = lv;
          setHudLevel(lv);
        }
      }

      drawScene(ctx, s, performance.now());
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [ready, countdown, tutorialOpen, addScore, characterId, gameId, router]);

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    time: number
  ) => {
    if (!bgRef.current) {
      const g = ctx.createRadialGradient(
        CFG.PLAYER_X,
        CFG.PLAYER_Y,
        20,
        CFG.PLAYER_X,
        CFG.PLAYER_Y,
        CFG.W
      );
      g.addColorStop(0, '#FFF5F8');
      g.addColorStop(0.6, '#FFD6E5');
      g.addColorStop(1, '#C5E5FF');
      bgRef.current = g;
    }
    ctx.fillStyle = bgRef.current;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // 안전 원
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 143, 177, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(CFG.PLAYER_X, CFG.PLAYER_Y, CFG.PLAYER_SAFE_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 풍선
    for (const b of s.balloons) {
      if (b.popped) {
        // 펑 효과
        const elapsed = b.popAt ? performance.now() - b.popAt : 0;
        const t = Math.min(1, elapsed / 280);
        ctx.save();
        ctx.globalAlpha = 1 - t;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const r = 8 + t * 30;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }
      // 풍선 본체
      ctx.save();
      const grad = ctx.createRadialGradient(b.x - 5, b.y - 5, 2, b.x, b.y, CFG.BALLOON_R);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.4, b.color);
      grad.addColorStop(1, b.color);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, CFG.BALLOON_R, CFG.BALLOON_R + 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 매듭 + 끈
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(b.x - 3, b.y + CFG.BALLOON_R + 3);
      ctx.lineTo(b.x + 3, b.y + CFG.BALLOON_R + 3);
      ctx.lineTo(b.x, b.y + CFG.BALLOON_R + 8);
      ctx.fill();
      ctx.restore();
    }

    // 별 발사체
    for (const star of s.stars) {
      if (star.done) continue;
      ctx.save();
      ctx.font = `${CFG.STAR_RADIUS * 2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', star.x, star.y);
      ctx.restore();
    }

    // 캐릭터
    rendererRef.current?.draw(
      ctx,
      characterId,
      CFG.PLAYER_X - 26,
      CFG.PLAYER_Y - 30,
      60,
      'idle',
      time,
      false
    );
  };

  // 좌표를 향해 별 발사 (수동 조준)
  const fireStarToward = (targetX: number, targetY: number) => {
    const s = stateRef.current;
    if (s.isOver) return;
    const now = performance.now();
    if (now - s.lastFireAt < CFG.FIRE_COOLDOWN_MS) return;
    s.lastFireAt = now;
    const dx = targetX - CFG.PLAYER_X;
    const dy = targetY - CFG.PLAYER_Y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    s.stars.push({
      id: nextId(),
      x: CFG.PLAYER_X,
      y: CFG.PLAYER_Y,
      vx: (dx / len) * CFG.STAR_SPEED,
      vy: (dy / len) * CFG.STAR_SPEED,
      targetId: -1,
      done: false,
    });
    audio.play('select');
    vibrate('light');
  };

  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CFG.W / rect.width;
    const scaleY = CFG.H / rect.height;
    const clientX =
      'touches' in e
        ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0
        : e.clientX;
    const clientY =
      'touches' in e
        ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0
        : e.clientY;
    const localX = (clientX - rect.left) * scaleX;
    const localY = (clientY - rect.top) * scaleY;
    fireStarToward(localX, localY);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-cream select-none">
      <GameHUD
        level={hudLevel}
        onMenu={() => {
          pausedRef.current = true;
          setPaused(true);
        }}
      />
      <div className="relative mt-12" onTouchStart={handleTap} onMouseDown={handleTap}>
        <canvas
          ref={canvasRef}
          width={CFG.W}
          height={CFG.H}
          className="rounded-cute-lg shadow-xl bg-white"
          style={{ width: '100%', maxWidth: `${CFG.W}px`, aspectRatio: `${CFG.W} / ${CFG.H}`, maxHeight: 'calc(100dvh - 110px)', touchAction: 'none' }}
        />
        <AbilityEffectOverlay />
        <PauseModal
          open={paused}
          onResume={() => {
            pausedRef.current = false;
            setPaused(false);
          }}
          gameName="큐핑의 풍선 펑펑"
        />
        <TutorialOverlay
          gameId={gameId}
          onShow={() => setTutorialOpen(true)}
          onDismiss={() => setTutorialOpen(false)}
        />
        <AbilityIndicator />
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
      <div className="mt-3 text-center text-base font-sans font-semibold text-text-dark">
        쏠 방향을 탭(클릭)해서 별 발사
      </div>
    </div>
  );
}
