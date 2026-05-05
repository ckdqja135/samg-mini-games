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
  PLAYER_W: 50,
  PLAYER_H: 60,
  WALK_SPEED: 1.3,
  DROP_INTERVAL_BASE: 90,
  DROP_INTERVAL_MIN: 50,
  DROP_FALL_BASE: 1.6,
  DROP_FALL_MAX: 2.8,
  ITEM_SIZE: 32,
  FRUIT_SIZE: 28,
  FRUIT_SPAWN_INTERVAL: 320,
  FRUIT_FALL_BASE: 1.3,
  FRUIT_FALL_MAX: 2.2,
};

const FALLING_DEFS = {
  cake: { emoji: '🍰', score: 50, weight: 28, danger: false },
  donut: { emoji: '🍩', score: 30, weight: 30, danger: false },
  candy: { emoji: '🍬', score: 20, weight: 25, danger: false },
  star: { emoji: '⭐', score: 150, weight: 7, danger: false },
  bomb: { emoji: '💣', score: 0, weight: 10, danger: true },
};

const FRUIT_DEFS = {
  strawberry: { emoji: '🍓', score: 40, weight: 50 },
  cherry: { emoji: '🍒', score: 80, weight: 25 },
  lemon: { emoji: '🍋', score: 120, weight: 15 },
  grape: { emoji: '🍇', score: 220, weight: 10 },
};

interface FallingItem {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: keyof typeof FALLING_DEFS;
  caught: boolean;
}

interface FallingFruit {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: keyof typeof FRUIT_DEFS;
  collected: boolean;
}

export function CakeCatchGame({ gameId, characterId }: Props) {
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
    dir: 1, // 1=right, -1=left
    items: [] as FallingItem[],
    fruits: [] as FallingFruit[],
    nextSpawn: 50,
    nextFruitSpawn: 200,
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

      // 자동 좌우 이동 (벽에 닿으면 자동 반전)
      s.px += s.dir * CFG.WALK_SPEED;
      if (s.px < 8) {
        s.px = 8;
        s.dir = 1;
      } else if (s.px + CFG.PLAYER_W > CFG.W - 8) {
        s.px = CFG.W - 8 - CFG.PLAYER_W;
        s.dir = -1;
      }

      // 떨어지는 디저트/폭탄 스폰 — 시간이 지날수록 폭탄 가중치 증가
      s.nextSpawn--;
      if (s.nextSpawn <= 0) {
        const bombBoost = Math.min(60, Math.floor(s.distance / 4));
        const dynamicDefs = {
          ...FALLING_DEFS,
          bomb: { ...FALLING_DEFS.bomb, weight: FALLING_DEFS.bomb.weight + bombBoost },
        };
        const type = pickWeighted(dynamicDefs) as keyof typeof FALLING_DEFS;
        s.items.push({
          id: nextId(),
          x: randRange(20, CFG.W - 20 - CFG.ITEM_SIZE),
          y: -CFG.ITEM_SIZE,
          vy: randRange(CFG.DROP_FALL_BASE, CFG.DROP_FALL_MAX) + s.level * 0.15,
          type,
          caught: false,
        });
        const interval = Math.max(
          CFG.DROP_INTERVAL_MIN,
          CFG.DROP_INTERVAL_BASE - s.level * 5
        );
        s.nextSpawn = interval + Math.floor(Math.random() * 16);
      }

      s.items.forEach((it) => (it.y += it.vy));

      // 떨어지는 아이템 충돌/처리
      for (const it of s.items) {
        if (it.caught) continue;
        const def = FALLING_DEFS[it.type];
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
          if (def.danger) {
            handleGameOver();
            return;
          }
          it.caught = true;
          addScore(def.score, { isItemBonus: it.type === 'star' });
          audio.play(it.type === 'star' ? 'star' : 'fruit');
          vibrate('light');
        } else if (it.y > CFG.GROUND_Y) {
          // 바닥 통과 (놓침) → 그냥 사라짐
          it.caught = true;
        }
      }
      s.items = s.items.filter((it) => !it.caught);

      // 보너스 과일 (하늘에서 떨어짐)
      s.nextFruitSpawn--;
      if (s.nextFruitSpawn <= 0) {
        const type = pickWeighted(FRUIT_DEFS) as keyof typeof FRUIT_DEFS;
        s.fruits.push({
          id: nextId(),
          x: randRange(12, CFG.W - 12 - CFG.FRUIT_SIZE),
          y: -CFG.FRUIT_SIZE,
          vy: randRange(CFG.FRUIT_FALL_BASE, CFG.FRUIT_FALL_MAX) + s.level * 0.12,
          type,
          collected: false,
        });
        s.nextFruitSpawn = CFG.FRUIT_SPAWN_INTERVAL + Math.floor(Math.random() * 120);
      }

      s.fruits.forEach((fr) => (fr.y += fr.vy));

      // 보너스 과일 충돌
      for (const fr of s.fruits) {
        if (fr.collected) continue;
        if (
          aabbHits(
            s.px,
            s.py,
            CFG.PLAYER_W,
            CFG.PLAYER_H,
            fr.x,
            fr.y,
            CFG.FRUIT_SIZE,
            CFG.FRUIT_SIZE
          )
        ) {
          fr.collected = true;
          addScore(FRUIT_DEFS[fr.type].score, { isItemBonus: true });
          audio.play('fruit');
          vibrate('light');
        } else if (fr.y > CFG.GROUND_Y) {
          // 바닥 통과 (놓침)
          fr.collected = true;
        }
      }
      s.fruits = s.fruits.filter((fr) => !fr.collected);

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
      const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
      g.addColorStop(0, '#FFE0EC');
      g.addColorStop(0.5, '#FFF5E0');
      g.addColorStop(1, '#FFD6E5');
      bgRef.current = g;
    }
    ctx.fillStyle = bgRef.current;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // 바닥
    ctx.fillStyle = '#E8D5F2';
    ctx.fillRect(0, CFG.GROUND_Y, CFG.W, CFG.H - CFG.GROUND_Y);
    ctx.strokeStyle = '#C5B6E8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CFG.GROUND_Y);
    ctx.lineTo(CFG.W, CFG.GROUND_Y);
    ctx.stroke();

    // 떨어지는 보너스 과일
    s.fruits.forEach((fr) => {
      if (fr.collected) return;
      const cx = fr.x + CFG.FRUIT_SIZE / 2;
      const cy = fr.y + CFG.FRUIT_SIZE / 2;

      ctx.save();
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CFG.FRUIT_SIZE * 0.9);
      glow.addColorStop(0, 'rgba(130, 217, 181, 0.55)');
      glow.addColorStop(1, 'rgba(130, 217, 181, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, CFG.FRUIT_SIZE * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${CFG.FRUIT_SIZE}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(FRUIT_DEFS[fr.type].emoji, cx, cy);
      ctx.restore();
    });

    // 떨어지는 디저트/폭탄
    s.items.forEach((it) => {
      if (it.caught) return;
      const cx = it.x + CFG.ITEM_SIZE / 2;
      const cy = it.y + CFG.ITEM_SIZE / 2;
      const def = FALLING_DEFS[it.type];

      ctx.save();
      if (!def.danger) {
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CFG.ITEM_SIZE * 0.9);
        glow.addColorStop(0, 'rgba(255, 232, 154, 0.55)');
        glow.addColorStop(1, 'rgba(255, 232, 154, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, CFG.ITEM_SIZE * 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CFG.ITEM_SIZE);
        glow.addColorStop(0, 'rgba(255, 80, 80, 0.45)');
        glow.addColorStop(1, 'rgba(255, 80, 80, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, CFG.ITEM_SIZE, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `${CFG.ITEM_SIZE}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.emoji, cx, cy);
      ctx.restore();
    });

    // 캐릭터
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
          gameName="달콤핑의 디저트 파티"
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
            <p className="font-sans text-text-dark">준비 중...</p>
          </div>
        )}
      </div>
      <div className="mt-3 text-center text-base font-sans font-semibold text-text-dark">
        탭 / 스페이스바로 좌우 방향 전환 — 폭탄은 피하기
      </div>
    </div>
  );
}
