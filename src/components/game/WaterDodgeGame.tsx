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
  PLAYER_W: 44,
  PLAYER_H: 60,
  WALK_SPEED: 2.0,
  JUMP_VY: -10,
  GRAVITY: 0.5,
  SPRAY_BASE_INTERVAL: 65,
  SPRAY_MIN_INTERVAL: 28,
  SPRAY_FALL_SPEED: 4.5,
  ITEM_INTERVAL: 200,
  ITEM_SIZE: 28,
};

interface Spray {
  id: number;
  x: number;
  y: number;
  width: number;
  speed: number;
}

interface Item {
  id: number;
  x: number;
  y: number;
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
    vy: 0,
    onGround: true,
    dir: 1, // 1=right, -1=left
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

      // 점프 물리
      if (!s.onGround) {
        s.vy += CFG.GRAVITY;
        s.py += s.vy;
        if (s.py + CFG.PLAYER_H >= CFG.GROUND_Y) {
          s.py = CFG.GROUND_Y - CFG.PLAYER_H;
          s.vy = 0;
          s.onGround = true;
        }
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
          speed: CFG.SPRAY_FALL_SPEED + s.level * 0.4,
        });
        const interval = Math.max(
          CFG.SPRAY_MIN_INTERVAL,
          CFG.SPRAY_BASE_INTERVAL - s.level * 6
        );
        s.nextSpraySpawn = interval + Math.floor(Math.random() * 20);
      }

      s.sprays.forEach((sp) => (sp.y += sp.speed));
      s.sprays = s.sprays.filter((sp) => sp.y < CFG.H + 50);

      // 충돌 (물줄기는 길이가 화면 밖부터 바닥까지 잠재적으로 길지만,
      // 충돌은 떨어지는 머리 영역 + 짧은 꼬리로 판정 — 단순화 위해 머리 30px 박스로)
      for (const sp of s.sprays) {
        const sx = sp.x;
        const sy = sp.y;
        const sw = sp.width;
        const sh = 60; // 떨어지는 물줄기 머리 영역
        if (
          aabbHits(s.px + 8, s.py + 12, CFG.PLAYER_W - 16, CFG.PLAYER_H - 18, sx, sy, sw, sh)
        ) {
          handleGameOver();
          return;
        }
      }

      // 회피 콤보: 물줄기가 캐릭터 라인을 안전히 통과해 바닥 도달 시 콤보 +
      s.sprays.forEach((sp) => {
        if ((sp as Spray & { passed?: boolean }).passed) return;
        if (sp.y > s.py + CFG.PLAYER_H) {
          (sp as Spray & { passed?: boolean }).passed = true;
          addScore(15, {});
          if (frameRef.current % 4 === 0) audio.play('jump');
        }
      });

      // 아이템 스폰
      s.nextItemSpawn--;
      if (s.nextItemSpawn <= 0) {
        const type = pickWeighted(ITEM_DEFS) as keyof typeof ITEM_DEFS;
        s.items.push({
          id: nextId(),
          x: randRange(20, CFG.W - 20 - CFG.ITEM_SIZE),
          y: randRange(80, CFG.GROUND_Y - 180),
          type,
          collected: false,
        });
        s.nextItemSpawn = CFG.ITEM_INTERVAL + Math.floor(Math.random() * 100);
      }

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

      // 거리 점수 + 레벨업
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
  }, [ready, countdown, addScore, characterId, gameId, router]);

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

    // 바닥
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(0, CFG.GROUND_Y, CFG.W, CFG.H - CFG.GROUND_Y);
    ctx.strokeStyle = 'rgba(74, 59, 82, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, CFG.GROUND_Y);
    ctx.lineTo(CFG.W, CFG.GROUND_Y);
    ctx.stroke();

    // 물줄기
    s.sprays.forEach((sp) => {
      ctx.save();
      const grad = ctx.createLinearGradient(0, sp.y - 30, 0, sp.y + 80);
      grad.addColorStop(0, 'rgba(120, 200, 255, 0)');
      grad.addColorStop(0.4, 'rgba(120, 200, 255, 0.9)');
      grad.addColorStop(1, 'rgba(80, 160, 255, 0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(sp.x, sp.y - 30, sp.width, 100);
      // 물방울 헤드
      ctx.fillStyle = '#7DC4FF';
      ctx.beginPath();
      ctx.arc(sp.x + sp.width / 2, sp.y, sp.width * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 아이템
    s.items.forEach((it) => {
      if (it.collected) return;
      const cy = it.y + CFG.ITEM_SIZE / 2 + Math.sin(time / 320 + it.id) * 3;
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
        탭 / 스페이스바로 점프 회피
      </div>
    </div>
  );
}
