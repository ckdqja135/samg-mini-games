'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGamePlayStore } from '@/store/gameStore';
import { CharacterRenderer } from '@/utils/CharacterRenderer';
import { aabbHits, nextId, randRange, pickWeighted } from '@/lib/gameUtils';
import type { GameOverResult } from '@/types/game';
import { AbilityEffectOverlay } from './AbilityEffectOverlay';
import { GameHUD } from './GameHUD';
import { audio } from '@/lib/audio';
import { vibrate } from '@/lib/haptic';

interface Props {
  gameId: string;
  characterId: string;
}

const CFG = {
  W: 375,
  H: 600,
  GROUND_Y: 510,
  PLAYER_W: 50,
  PLAYER_H: 60,
  WALK_SPEED: 2.6,
  JUMP_VY: -11,
  GRAVITY: 0.55,
  DROP_INTERVAL_BASE: 50,
  DROP_INTERVAL_MIN: 22,
  DROP_FALL_BASE: 3.0,
  DROP_FALL_MAX: 5.5,
  ITEM_SIZE: 32,
  MAX_MISS: 3,
};

const ITEM_DEFS = {
  cake: { emoji: '🍰', score: 50, weight: 28, danger: false },
  donut: { emoji: '🍩', score: 30, weight: 30, danger: false },
  candy: { emoji: '🍬', score: 20, weight: 25, danger: false },
  star: { emoji: '⭐', score: 150, weight: 7, danger: false },
  bomb: { emoji: '💣', score: 0, weight: 10, danger: true },
};

interface FallingItem {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: keyof typeof ITEM_DEFS;
  caught: boolean;
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
    vy: 0,
    onGround: true,
    dir: 1,
    items: [] as FallingItem[],
    nextSpawn: 50,
    miss: 0,
    distance: 0,
    isOver: false,
    level: 1,
  });

  const addScore = useGamePlayStore((s) => s.addScore);
  const resetGame = useGamePlayStore((s) => s.resetGame);
  const setCharacter = useGamePlayStore((s) => s.setCharacter);

  const [hudLevel, setHudLevel] = useState(1);
  const [missDisplay, setMissDisplay] = useState(0);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);

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
      frameRef.current++;

      // 자동 좌우 왕복
      s.px += s.dir * CFG.WALK_SPEED;
      if (s.px < 8) {
        s.px = 8;
        s.dir = 1;
      } else if (s.px + CFG.PLAYER_W > CFG.W - 8) {
        s.px = CFG.W - 8 - CFG.PLAYER_W;
        s.dir = -1;
      }

      // 점프
      if (!s.onGround) {
        s.vy += CFG.GRAVITY;
        s.py += s.vy;
        if (s.py + CFG.PLAYER_H >= CFG.GROUND_Y) {
          s.py = CFG.GROUND_Y - CFG.PLAYER_H;
          s.vy = 0;
          s.onGround = true;
        }
      }

      // 스폰
      s.nextSpawn--;
      if (s.nextSpawn <= 0) {
        const type = pickWeighted(ITEM_DEFS) as keyof typeof ITEM_DEFS;
        s.items.push({
          id: nextId(),
          x: randRange(20, CFG.W - 20 - CFG.ITEM_SIZE),
          y: -CFG.ITEM_SIZE,
          vy: randRange(CFG.DROP_FALL_BASE, CFG.DROP_FALL_MAX) + s.level * 0.3,
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

      // 충돌 + 처리
      for (const it of s.items) {
        if (it.caught) continue;
        const def = ITEM_DEFS[it.type];
        // 캐릭터 닿음
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
        } else if (it.y > CFG.GROUND_Y - CFG.ITEM_SIZE / 2) {
          // 바닥에 떨어짐
          it.caught = true;
          if (!def.danger) {
            // 디저트 놓침: 콤보 리셋 + miss 증가
            useGamePlayStore.setState((g) => ({ comboCount: 0 }));
            s.miss++;
            setMissDisplay(s.miss);
            audio.play('breakable');
            vibrate('medium');
            if (s.miss >= CFG.MAX_MISS) {
              handleGameOver();
              return;
            }
          }
        }
      }
      s.items = s.items.filter((it) => !it.caught);

      // 거리 점수
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
  }, [ready, countdown, addScore, characterId, gameId, router]);

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

    // 바닥 (테이블 느낌)
    ctx.fillStyle = '#E8D5F2';
    ctx.fillRect(0, CFG.GROUND_Y, CFG.W, CFG.H - CFG.GROUND_Y);
    ctx.strokeStyle = '#C5B6E8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CFG.GROUND_Y);
    ctx.lineTo(CFG.W, CFG.GROUND_Y);
    ctx.stroke();

    // 떨어지는 아이템
    s.items.forEach((it) => {
      if (it.caught) return;
      const cx = it.x + CFG.ITEM_SIZE / 2;
      const cy = it.y + CFG.ITEM_SIZE / 2;
      const def = ITEM_DEFS[it.type];

      ctx.save();
      if (!def.danger) {
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CFG.ITEM_SIZE * 0.9);
        glow.addColorStop(0, 'rgba(255, 232, 154, 0.5)');
        glow.addColorStop(1, 'rgba(255, 232, 154, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, CFG.ITEM_SIZE * 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 폭탄 위험 표시 (빨간 후광)
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CFG.ITEM_SIZE);
        glow.addColorStop(0, 'rgba(255, 80, 80, 0.4)');
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
    let anim: 'idle' | 'walk' | 'jump' = 'walk';
    if (!s.onGround) anim = 'jump';
    rendererRef.current?.draw(
      ctx,
      characterId,
      s.px,
      s.py,
      CFG.PLAYER_H,
      anim,
      time,
      s.dir < 0
    );

    // 우상단 miss 표시
    ctx.font = '14px DungGeunMo, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#E66B92';
    ctx.fillText(`놓침 ${s.miss}/${CFG.MAX_MISS}`, CFG.W - 10, 50);
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
      <GameHUD level={hudLevel} onMenu={() => router.push('/games')} />
      <div className="relative mt-12" onTouchStart={handleTap} onMouseDown={handleTap}>
        <canvas
          ref={canvasRef}
          width={CFG.W}
          height={CFG.H}
          className="rounded-cute-lg shadow-xl bg-white"
          style={{ width: `${CFG.W}px`, height: `${CFG.H}px`, maxWidth: '100%', touchAction: 'none' }}
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
        탭 / 스페이스바로 점프해서 캐치 — 💣 폭탄은 피하세요!
      </div>
    </div>
  );
}
