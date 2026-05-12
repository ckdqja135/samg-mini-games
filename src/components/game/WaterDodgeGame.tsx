'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGamePlayStore } from '@/store/gameStore';
import { CharacterRenderer } from '@/utils/CharacterRenderer';
import { aabbHits, nextId, randRange, pickWeighted } from '@/lib/gameUtils';
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
  GROUND_Y: 610,
  PLAYER_W: 44,
  PLAYER_H: 60,
  WALK_SPEED: 1.8,
  ITEM_LIFE_FRAMES: 480, // 약 8초간 바닥에 머무름
  SPRAY_BASE_INTERVAL: 55,
  SPRAY_MIN_INTERVAL: 20,
  SPRAY_FALL_SPEED: 5.6,
  ITEM_INTERVAL: 200,
  ITEM_SIZE: 28,
};

interface Spray {
  id: number;
  x: number;
  y: number;
  width: number;
  speed: number;
  passed?: boolean;
}

interface Item {
  id: number;
  x: number;
  y: number;
  spawnedFrame: number;
  type: keyof typeof ITEM_DEFS;
  collected: boolean;
}

const ITEM_DEFS = {
  strawberry: { emoji: '🍓', score: 30, weight: 50 },
  cherry: { emoji: '🍒', score: 60, weight: 25 },
  lemon: { emoji: '🍋', score: 100, weight: 15 },
  grape: { emoji: '🍇', score: 200, weight: 10 },
};

export function WaterDodgeGame({ gameId, characterId }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CharacterRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const frameRef = useRef(0);
  const bgRef = useRef<CanvasGradient | null>(null);

  const stateRef = useRef({
    px: CFG.W / 2 - CFG.PLAYER_W / 2,
    py: CFG.GROUND_Y - CFG.PLAYER_H,
    dir: 1, // 1=right, -1=left (자동 이동 방향)
    sprays: [] as Spray[],
    items: [] as Item[],
    nextSpraySpawn: 60,
    nextItemSpawn: 200,
    distance: 0,
    isOver: false,
    level: 1,
  });

  const addScore = useGamePlayStore((s) => s.addScore);
  const resetGame = useGamePlayStore((s) => s.resetGame);
  const setCharacter = useGamePlayStore((s) => s.setCharacter);

  const [hudLevel, setHudLevel] = useState(1);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    setCharacter(characterId);
    resetGame();
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
  }, [characterId, resetGame, setCharacter]);

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
      };
      try {
        sessionStorage.setItem(`samg:lastResult:${gameId}`, JSON.stringify(result));
      } catch {}
      router.push(`/games/${gameId}/result`);
    };

    const loop = () => {
      const s = stateRef.current;
      if (s.isOver) return;
      if (pausedRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }
      frameRef.current++;

      // 자동 좌우 이동 (벽에 닿으면 방향 자동 반전)
      s.px += s.dir * CFG.WALK_SPEED;
      if (s.px < 8) {
        s.px = 8;
        s.dir = 1;
      } else if (s.px + CFG.PLAYER_W > CFG.W - 8) {
        s.px = CFG.W - 8 - CFG.PLAYER_W;
        s.dir = -1;
      }

      // 물줄기 스폰
      s.nextSpraySpawn--;
      if (s.nextSpraySpawn <= 0) {
        const w = randRange(20, 38);
        s.sprays.push({
          id: nextId(),
          x: randRange(0, CFG.W - w),
          y: -randRange(20, 80),
          width: w,
          speed: CFG.SPRAY_FALL_SPEED + s.level * 0.64,
        });
        const interval = Math.max(
          CFG.SPRAY_MIN_INTERVAL,
          CFG.SPRAY_BASE_INTERVAL - s.level * 10
        );
        s.nextSpraySpawn = interval + Math.floor(Math.random() * 20);
      }

      s.sprays.forEach((sp) => (sp.y += sp.speed));
      s.sprays = s.sprays.filter((sp) => sp.y < CFG.H + 50);

      for (const sp of s.sprays) {
        const sx = sp.x;
        const sy = sp.y;
        const sw = sp.width;
        const sh = 60;
        if (
          aabbHits(s.px + 8, s.py + 12, CFG.PLAYER_W - 16, CFG.PLAYER_H - 18, sx, sy, sw, sh)
        ) {
          handleGameOver();
          return;
        }
      }

      // 회피 콤보
      s.sprays.forEach((sp) => {
        if (sp.passed) return;
        if (sp.y > s.py + CFG.PLAYER_H) {
          sp.passed = true;
          addScore(15, {});
          if (frameRef.current % 4 === 0) audio.play('jump');
        }
      });

      // 아이템 스폰: 바닥(지면) 위에 랜덤 위치로 생성
      s.nextItemSpawn--;
      if (s.nextItemSpawn <= 0) {
        const type = pickWeighted(ITEM_DEFS) as keyof typeof ITEM_DEFS;
        s.items.push({
          id: nextId(),
          x: randRange(12, CFG.W - 12 - CFG.ITEM_SIZE),
          y: CFG.GROUND_Y - CFG.ITEM_SIZE - 2,
          spawnedFrame: frameRef.current,
          type,
          collected: false,
        });
        s.nextItemSpawn = CFG.ITEM_INTERVAL + Math.floor(Math.random() * 100);
      }

      // 수명 만료된 아이템 제거
      s.items = s.items.filter(
        (it) =>
          !it.collected &&
          frameRef.current - it.spawnedFrame < CFG.ITEM_LIFE_FRAMES
      );

      // 아이템 수집
      for (const it of s.items) {
        if (it.collected) continue;
        if (
          aabbHits(
            s.px,
            s.py,
            CFG.PLAYER_W,
            CFG.PLAYER_H,
            it.x,
            it.y,
            CFG.ITEM_SIZE,
            CFG.ITEM_SIZE
          )
        ) {
          it.collected = true;
          addScore(ITEM_DEFS[it.type].score, { isItemBonus: true });
          audio.play('fruit');
          vibrate('light');
        }
      }
      s.items = s.items.filter((it) => !it.collected);

      if (frameRef.current % 30 === 0) {
        s.distance += 1;
        addScore(1, { passive: true });
        const newLevel = s.distance < 20 ? 1 : s.distance < 50 ? 2 : s.distance < 100 ? 3 : 4;
        if (newLevel !== s.level) {
          s.level = newLevel;
          setHudLevel(newLevel);
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
      const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
      g.addColorStop(0, '#C5E5FF');
      g.addColorStop(0.7, '#FFD6E5');
      g.addColorStop(1, '#B5E8D5');
      bgRef.current = g;
    }
    ctx.fillStyle = bgRef.current;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(0, CFG.GROUND_Y, CFG.W, CFG.H - CFG.GROUND_Y);
    ctx.strokeStyle = 'rgba(74, 59, 82, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, CFG.GROUND_Y);
    ctx.lineTo(CFG.W, CFG.GROUND_Y);
    ctx.stroke();

    s.sprays.forEach((sp) => {
      ctx.save();
      const grad = ctx.createLinearGradient(0, sp.y - 30, 0, sp.y + 80);
      grad.addColorStop(0, 'rgba(120, 200, 255, 0)');
      grad.addColorStop(0.4, 'rgba(120, 200, 255, 0.9)');
      grad.addColorStop(1, 'rgba(80, 160, 255, 0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(sp.x, sp.y - 30, sp.width, 100);
      ctx.fillStyle = '#7DC4FF';
      ctx.beginPath();
      ctx.arc(sp.x + sp.width / 2, sp.y, sp.width * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    s.items.forEach((it) => {
      if (it.collected) return;
      const cy = it.y + CFG.ITEM_SIZE / 2 + Math.sin(time / 380 + it.id) * 1.2;
      ctx.save();
      const glow = ctx.createRadialGradient(
        it.x + CFG.ITEM_SIZE / 2,
        cy,
        2,
        it.x + CFG.ITEM_SIZE / 2,
        cy,
        CFG.ITEM_SIZE * 0.9
      );
      glow.addColorStop(0, 'rgba(255, 232, 154, 0.55)');
      glow.addColorStop(1, 'rgba(255, 232, 154, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(it.x + CFG.ITEM_SIZE / 2, cy, CFG.ITEM_SIZE * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${CFG.ITEM_SIZE}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ITEM_DEFS[it.type].emoji, it.x + CFG.ITEM_SIZE / 2, cy);
      ctx.restore();
    });

    rendererRef.current?.draw(
      ctx,
      characterId,
      s.px,
      s.py,
      CFG.PLAYER_H,
      'walk',
      time,
      s.dir < 0
    );
  };

  // 방향 반전: 탭/스페이스바 공통 핸들러
  const flipDirection = () => {
    const s = stateRef.current;
    if (s.isOver) return;
    s.dir = s.dir === 1 ? -1 : 1;
    audio.play('jump');
    vibrate('light');
  };

  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    flipDirection();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        flipDirection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-cream select-none">
      <GameHUD
        level={hudLevel}
        onMenu={() => {
          pausedRef.current = true;
          setPaused(true);
        }}
      />
      <div
        className="relative mt-12"
        onTouchStart={handleTap}
        onMouseDown={handleTap}
      >
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
          gameName="꽁꽁핑의 물줄기 피하기"
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
        탭 / 스페이스바로 좌우 방향 전환
      </div>
    </div>
  );
}
