'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGamePlayStore } from '@/store/gameStore';
import { CharacterRenderer } from '@/utils/CharacterRenderer';
import { aabbHits, nextId, randRange } from '@/lib/gameUtils';
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
  PLAYER_W: 44,
  PLAYER_H: 60,
  PLAYER_Y: 580,
  LADDER_X_LEFT: 110,
  LADDER_X_RIGHT: 265,
  LADDER_WIDTH: 50,
  CLIMB_SPEED: 0.95,
  ITEM_FALL_SPEED: 2.4,
  ITEM_SIZE: 32,
  SPAWN_INTERVAL_BASE: 75,
  SPAWN_INTERVAL_MIN: 42,
};

interface FallingObj {
  id: number;
  side: 'left' | 'right';
  y: number;
  type: 'star' | 'meteor' | 'fruit';
  caught: boolean;
}

const TYPE_DEFS = {
  star: { emoji: '⭐', score: 80, danger: false },
  meteor: { emoji: '☄️', score: 0, danger: true },
  fruit: { emoji: '🍓', score: 30, danger: false },
};

export function StarLadderGame({ gameId, characterId }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CharacterRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const frameRef = useRef(0);
  const bgRef = useRef<CanvasGradient | null>(null);
  const ladderOffsetRef = useRef(0);

  const stateRef = useRef({
    side: 'left' as 'left' | 'right',
    objs: [] as FallingObj[],
    nextSpawn: 30,
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

      // 사다리 등반 효과 (배경 스크롤)
      ladderOffsetRef.current = (ladderOffsetRef.current + CFG.CLIMB_SPEED * (1 + s.level * 0.1)) % 30;

      // 스폰
      s.nextSpawn--;
      if (s.nextSpawn <= 0) {
        const r = Math.random();
        const type: FallingObj['type'] =
          r < 0.45 ? 'star' : r < 0.75 ? 'fruit' : 'meteor';
        const side: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
        s.objs.push({
          id: nextId(),
          side,
          y: -CFG.ITEM_SIZE,
          type,
          caught: false,
        });
        const interval = Math.max(
          CFG.SPAWN_INTERVAL_MIN,
          CFG.SPAWN_INTERVAL_BASE - s.level * 5
        );
        s.nextSpawn = interval + Math.floor(Math.random() * 16);
      }

      const fallSpeed = CFG.ITEM_FALL_SPEED + s.level * 0.22;
      s.objs.forEach((o) => (o.y += fallSpeed));

      // 충돌
      const playerX =
        s.side === 'left' ? CFG.LADDER_X_LEFT : CFG.LADDER_X_RIGHT;
      const playerCenterX = playerX + CFG.LADDER_WIDTH / 2;
      const playerLeft = playerCenterX - CFG.PLAYER_W / 2;

      for (const o of s.objs) {
        if (o.caught) continue;
        if (o.side !== s.side) continue;
        const objX =
          o.side === 'left'
            ? CFG.LADDER_X_LEFT + CFG.LADDER_WIDTH / 2 - CFG.ITEM_SIZE / 2
            : CFG.LADDER_X_RIGHT + CFG.LADDER_WIDTH / 2 - CFG.ITEM_SIZE / 2;
        if (
          aabbHits(
            playerLeft,
            CFG.PLAYER_Y,
            CFG.PLAYER_W,
            CFG.PLAYER_H,
            objX,
            o.y,
            CFG.ITEM_SIZE,
            CFG.ITEM_SIZE
          )
        ) {
          const def = TYPE_DEFS[o.type];
          if (def.danger) {
            handleGameOver();
            return;
          }
          o.caught = true;
          addScore(def.score, { isItemBonus: o.type === 'star' });
          audio.play(o.type === 'star' ? 'star' : 'fruit');
          vibrate('light');
        }
      }
      s.objs = s.objs.filter((o) => !o.caught && o.y < CFG.H + 50);

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
  }, [ready, countdown, tutorialOpen, addScore, characterId, gameId, router]);

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    time: number
  ) => {
    if (!bgRef.current) {
      const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
      g.addColorStop(0, '#2D1B4E');
      g.addColorStop(0.5, '#5B3F8C');
      g.addColorStop(1, '#FF8FB1');
      bgRef.current = g;
    }
    ctx.fillStyle = bgRef.current;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // 배경 별 (시차)
    const t = (time / 60) % CFG.H;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 24; i++) {
      const px = (i * 47) % CFG.W;
      const py = ((i * 73 + t) % CFG.H);
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 사다리 두 개 (등반 효과)
    const drawLadder = (x: number, side: 'left' | 'right') => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x, 0, CFG.LADDER_WIDTH, CFG.H);
      ctx.strokeStyle = '#FFD6E5';
      ctx.lineWidth = 3;
      // 양 옆 기둥
      ctx.beginPath();
      ctx.moveTo(x + 4, 0);
      ctx.lineTo(x + 4, CFG.H);
      ctx.moveTo(x + CFG.LADDER_WIDTH - 4, 0);
      ctx.lineTo(x + CFG.LADDER_WIDTH - 4, CFG.H);
      ctx.stroke();
      // 가로대 (스크롤 효과)
      const off = ladderOffsetRef.current;
      ctx.lineWidth = 2;
      for (let y = -off; y < CFG.H; y += 30) {
        ctx.beginPath();
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x + CFG.LADDER_WIDTH - 4, y);
        ctx.stroke();
      }
      // 활성 사다리 강조
      if (s.side === side) {
        ctx.strokeStyle = '#FFE89A';
        ctx.lineWidth = 4;
        ctx.strokeRect(x - 2, 0, CFG.LADDER_WIDTH + 4, CFG.H);
      }
      ctx.restore();
    };
    drawLadder(CFG.LADDER_X_LEFT, 'left');
    drawLadder(CFG.LADDER_X_RIGHT, 'right');

    // 떨어지는 오브젝트
    for (const o of s.objs) {
      if (o.caught) continue;
      const ox =
        o.side === 'left'
          ? CFG.LADDER_X_LEFT + CFG.LADDER_WIDTH / 2 - CFG.ITEM_SIZE / 2
          : CFG.LADDER_X_RIGHT + CFG.LADDER_WIDTH / 2 - CFG.ITEM_SIZE / 2;
      const def = TYPE_DEFS[o.type];
      ctx.save();
      if (def.danger) {
        const cx = ox + CFG.ITEM_SIZE / 2;
        const cy = o.y + CFG.ITEM_SIZE / 2;
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CFG.ITEM_SIZE);
        glow.addColorStop(0, 'rgba(255, 100, 100, 0.5)');
        glow.addColorStop(1, 'rgba(255, 100, 100, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, CFG.ITEM_SIZE, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `${CFG.ITEM_SIZE}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.emoji, ox + CFG.ITEM_SIZE / 2, o.y + CFG.ITEM_SIZE / 2);
      ctx.restore();
    }

    // 캐릭터
    const px =
      s.side === 'left' ? CFG.LADDER_X_LEFT : CFG.LADDER_X_RIGHT;
    const playerLeft = px + CFG.LADDER_WIDTH / 2 - CFG.PLAYER_W / 2;
    rendererRef.current?.draw(
      ctx,
      characterId,
      playerLeft,
      CFG.PLAYER_Y,
      CFG.PLAYER_H,
      'idle',
      time,
      false
    );
  };

  const swap = () => {
    const s = stateRef.current;
    if (s.isOver) return;
    s.side = s.side === 'left' ? 'right' : 'left';
    audio.play('select');
    vibrate('light');
  };

  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    swap();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        swap();
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
          gameName="샤샤핑의 별빛 사다리"
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
      <div className="mt-3 text-center text-xs text-text-light font-pixel">
        탭 / 스페이스바로 좌우 사다리 전환
      </div>
    </div>
  );
}
