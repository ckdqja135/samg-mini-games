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
  H: 600,
  RIVER_TOP: 120,
  RIVER_BOTTOM: 560,
  PLAYER_X: 80,
  PLAYER_W: 50,
  PLAYER_H: 60,
  PLAYER_GROUND_Y: 470,
  JUMP_VY: -10.5,
  GRAVITY: 0.5,
  SCROLL_BASE: 2.6,
  SCROLL_MAX: 4.6,
  ITEM_SIZE: 30,
  ROCK_W: 40,
  ROCK_H: 36,
  SPAWN_INTERVAL_BASE: 60,
  SPAWN_INTERVAL_MIN: 30,
};

const ITEM_DEFS = {
  strawberry: { emoji: '🍓', score: 30, weight: 50 },
  cherry: { emoji: '🍒', score: 60, weight: 25 },
  lemon: { emoji: '🍋', score: 100, weight: 15 },
  grape: { emoji: '🍇', score: 200, weight: 10 },
};

interface Hazard {
  id: number;
  type: 'rock';
  x: number;
  y: number;
  passed: boolean;
}

interface Item {
  id: number;
  x: number;
  y: number;
  type: keyof typeof ITEM_DEFS;
  collected: boolean;
}

export function FruitRiverGame({ gameId, characterId }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CharacterRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const frameRef = useRef(0);
  const bgRef = useRef<CanvasGradient | null>(null);
  const waterOffsetRef = useRef(0);

  const stateRef = useRef({
    py: CFG.PLAYER_GROUND_Y,
    vy: 0,
    onGround: true,
    hazards: [] as Hazard[],
    items: [] as Item[],
    nextSpawn: 50,
    scroll: CFG.SCROLL_BASE,
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
    if (!ready || countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 700);
    return () => clearTimeout(t);
  }, [countdown, ready]);

  useEffect(() => {
    if (!ready || countdown !== null) return;
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
      waterOffsetRef.current = (waterOffsetRef.current + s.scroll * 1.5) % 60;

      // 점프 물리
      if (!s.onGround) {
        s.vy += CFG.GRAVITY;
        s.py += s.vy;
        if (s.py >= CFG.PLAYER_GROUND_Y) {
          s.py = CFG.PLAYER_GROUND_Y;
          s.vy = 0;
          s.onGround = true;
        }
      }

      // 스폰
      s.nextSpawn--;
      if (s.nextSpawn <= 0) {
        const isHazard = Math.random() < 0.4;
        if (isHazard) {
          s.hazards.push({
            id: nextId(),
            type: 'rock',
            x: CFG.W + 20,
            y: CFG.PLAYER_GROUND_Y + CFG.PLAYER_H - CFG.ROCK_H,
            passed: false,
          });
        } else {
          const type = pickWeighted(ITEM_DEFS) as keyof typeof ITEM_DEFS;
          // 과일은 점프 높이에 위치 → 점프 시 캐치
          const isHigh = Math.random() < 0.7;
          s.items.push({
            id: nextId(),
            x: CFG.W + 20,
            y: isHigh
              ? CFG.PLAYER_GROUND_Y - 30
              : CFG.PLAYER_GROUND_Y + CFG.PLAYER_H / 2 - CFG.ITEM_SIZE / 2,
            type,
            collected: false,
          });
        }
        const interval = Math.max(
          CFG.SPAWN_INTERVAL_MIN,
          CFG.SPAWN_INTERVAL_BASE - s.level * 5
        );
        s.nextSpawn = interval + Math.floor(Math.random() * 25);
      }

      s.hazards.forEach((h) => (h.x -= s.scroll));
      s.items.forEach((it) => (it.x -= s.scroll));
      s.hazards = s.hazards.filter((h) => h.x + CFG.ROCK_W > -10);
      s.items = s.items.filter((it) => it.x + CFG.ITEM_SIZE > -10 && !it.collected);

      // 충돌
      for (const h of s.hazards) {
        if (
          aabbHits(
            CFG.PLAYER_X + 6,
            s.py + 8,
            CFG.PLAYER_W - 12,
            CFG.PLAYER_H - 12,
            h.x,
            h.y,
            CFG.ROCK_W,
            CFG.ROCK_H
          )
        ) {
          handleGameOver();
          return;
        }
        if (!h.passed && h.x + CFG.ROCK_W < CFG.PLAYER_X) {
          h.passed = true;
          addScore(30, {});
          audio.play('jump');
        }
      }
      for (const it of s.items) {
        if (it.collected) continue;
        if (
          aabbHits(
            CFG.PLAYER_X,
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

      // 거리 점수 + 레벨업
      if (frameRef.current % 30 === 0) {
        s.distance += 1;
        addScore(1, { passive: true });
        const lv = s.distance < 20 ? 1 : s.distance < 50 ? 2 : s.distance < 100 ? 3 : 4;
        if (lv !== s.level) {
          s.level = lv;
          s.scroll = CFG.SCROLL_BASE + (CFG.SCROLL_MAX - CFG.SCROLL_BASE) * ((lv - 1) / 3);
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
  }, [ready, countdown, addScore, characterId, gameId, router]);

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    time: number
  ) => {
    if (!bgRef.current) {
      const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
      g.addColorStop(0, '#FFE0EC');
      g.addColorStop(0.4, '#C5E5FF');
      g.addColorStop(1, '#7DC4FF');
      bgRef.current = g;
    }
    ctx.fillStyle = bgRef.current;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // 강물
    ctx.fillStyle = '#7DC4FF';
    ctx.fillRect(0, CFG.RIVER_TOP, CFG.W, CFG.RIVER_BOTTOM - CFG.RIVER_TOP);
    // 물결 (스크롤)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    const off = waterOffsetRef.current;
    for (let y = CFG.RIVER_TOP + 10; y < CFG.RIVER_BOTTOM; y += 24) {
      ctx.beginPath();
      for (let x = -off; x < CFG.W; x += 60) {
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 15, y - 5, x + 30, y);
        ctx.quadraticCurveTo(x + 45, y + 5, x + 60, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 강 둑
    ctx.fillStyle = '#82D9B5';
    ctx.fillRect(0, CFG.RIVER_BOTTOM, CFG.W, CFG.H - CFG.RIVER_BOTTOM);
    ctx.fillRect(0, 0, CFG.W, CFG.RIVER_TOP);

    // 보드 (캐릭터 발 아래)
    const boardY = CFG.PLAYER_GROUND_Y + CFG.PLAYER_H - 6;
    ctx.fillStyle = '#A78060';
    ctx.fillRect(CFG.PLAYER_X - 6, boardY, CFG.PLAYER_W + 12, 8);
    ctx.fillStyle = '#8B6644';
    ctx.fillRect(CFG.PLAYER_X - 6, boardY + 5, CFG.PLAYER_W + 12, 3);

    // 바위 장애물
    for (const h of s.hazards) {
      ctx.save();
      ctx.fillStyle = '#7B6B7B';
      ctx.beginPath();
      const r = 8;
      const x = h.x;
      const y = h.y;
      const w = CFG.ROCK_W;
      const hh = CFG.ROCK_H;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + hh - r);
      ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
      ctx.lineTo(x + r, y + hh);
      ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();
      ctx.strokeStyle = '#5A4A5A';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 과일
    for (const it of s.items) {
      if (it.collected) continue;
      const cx = it.x + CFG.ITEM_SIZE / 2;
      const cy = it.y + CFG.ITEM_SIZE / 2 + Math.sin(time / 320 + it.id) * 2;
      ctx.save();
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CFG.ITEM_SIZE * 0.9);
      glow.addColorStop(0, 'rgba(255, 232, 154, 0.55)');
      glow.addColorStop(1, 'rgba(255, 232, 154, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, CFG.ITEM_SIZE * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${CFG.ITEM_SIZE}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ITEM_DEFS[it.type].emoji, cx, cy);
      ctx.restore();
    }

    // 캐릭터
    let anim: 'idle' | 'jump' | 'walk' = 'idle';
    if (!s.onGround) anim = 'jump';
    rendererRef.current?.draw(
      ctx,
      characterId,
      CFG.PLAYER_X,
      s.py,
      CFG.PLAYER_H,
      anim,
      time,
      false
    );
  };

  const tap = () => {
    const s = stateRef.current;
    if (s.isOver || !s.onGround) return;
    s.vy = CFG.JUMP_VY;
    s.onGround = false;
    audio.play('jump');
    vibrate('light');
  };

  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    tap();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        tap();
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
      <div className="relative mt-12" onTouchStart={handleTap} onMouseDown={handleTap}>
        <canvas
          ref={canvasRef}
          width={CFG.W}
          height={CFG.H}
          className="rounded-cute-lg shadow-xl bg-white"
          style={{ width: `${CFG.W}px`, height: `${CFG.H}px`, maxWidth: '100%', touchAction: 'none' }}
        />
        <AbilityEffectOverlay />
        <PauseModal
          open={paused}
          onResume={() => {
            pausedRef.current = false;
            setPaused(false);
          }}
          gameName="과일 흐름타기"
        />
        <TutorialOverlay gameId={gameId} onDismiss={() => {}} />
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
      <div className="mt-3 text-center text-xs text-text-light font-pixel">
        탭 / 스페이스바로 점프 — 바위 회피 + 과일 캐치
      </div>
    </div>
  );
}
