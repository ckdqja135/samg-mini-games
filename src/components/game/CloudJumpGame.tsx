'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGamePlayStore } from '@/store/gameStore';
import { CharacterRenderer } from '@/utils/CharacterRenderer';
import {
  CLOUD_JUMP_CONFIG,
  generateCloud,
  generateInitialClouds,
  getCloudColor,
  getFruitEmoji,
  getFruitScore,
  levelFromHeight,
  maybeGenerateFruit,
} from '@/data/cloudJump';
import type {
  Cloud,
  Fruit,
  GameState,
  GameOverResult,
} from '@/types/cloudJump';
import { AbilityEffectOverlay } from './AbilityEffectOverlay';
import { GameHUD } from './GameHUD';
import { PauseModal } from './PauseModal';
import { TutorialOverlay } from './TutorialOverlay';
import { AbilityIndicator } from './AbilityIndicator';
import { audio } from '@/lib/audio';
import { vibrate } from '@/lib/haptic';

interface CloudJumpGameProps {
  gameId: string;
  characterId: string;
}

const {
  GRAVITY,
  JUMP_POWER,
  TRAMPOLINE_POWER,
  MOVE_SPEED,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_HEIGHT,
  CLOUD_COUNT,
  MIN_VERTICAL_GAP,
  MAX_VERTICAL_GAP,
} = CLOUD_JUMP_CONFIG;

function createInitialState(): GameState {
  const clouds = generateInitialClouds();
  const startCloud = clouds[0];

  // 시작 구름을 제외한 각 구름 위에 확률적으로 과일 스폰
  const fruits: Fruit[] = [];
  for (let i = 1; i < clouds.length; i++) {
    const fruit = maybeGenerateFruit(clouds[i]);
    if (fruit) fruits.push(fruit);
  }

  return {
    player: {
      x: startCloud.x + startCloud.width / 2 - 24,
      y: startCloud.y - PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      width: 48,
      height: PLAYER_HEIGHT,
      hurtUntil: 0,
    },
    clouds,
    fruits,
    cameraY: 0,
    highestY: 0,
    level: 1,
    spawnTopY: clouds.reduce((min, c) => Math.min(min, c.y), CANVAS_HEIGHT),
    isGameOver: false,
    startedAt: 0,
    lastScoredCloudId: null,
  };
}

function checkLanding(player: GameState['player'], cloud: Cloud): boolean {
  if (cloud.broken) return false;
  if (player.vy <= 0) return false;
  const px1 = player.x;
  const px2 = player.x + player.width;
  const py2 = player.y + player.height;
  const cx1 = cloud.x;
  const cx2 = cloud.x + cloud.width;
  const cy1 = cloud.y;
  const cy2 = cloud.y + cloud.height;
  if (px2 < cx1 || px1 > cx2) return false;
  if (py2 < cy1 || py2 > cy2 + 8) return false;
  return true;
}

export function CloudJumpGame({ gameId, characterId }: CloudJumpGameProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const rendererRef = useRef<CharacterRenderer | null>(null);
  const directionRef = useRef<'left' | 'right'>('right');
  const animFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const addScore = useGamePlayStore((s) => s.addScore);
  const resetGame = useGamePlayStore((s) => s.resetGame);
  const setCharacter = useGamePlayStore((s) => s.setCharacter);

  const [hudLevel, setHudLevel] = useState(1);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // 게임오버 처리는 effect 안에서 정의되며 ref로 최신값 접근
  const gameOverRef = useRef<() => void>(() => {});

  useEffect(() => {
    setCharacter(characterId);
    resetGame();

    const renderer = new CharacterRenderer();
    rendererRef.current = renderer;

    renderer.preload().then(() => setReady(true)).catch(() => setReady(true));

    // 첫 사용자 입력 시 오디오 컨텍스트 깨우기 (모바일 자동재생 정책)
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

  // 카운트다운
  useEffect(() => {
    if (!ready) return;
    if (tutorialOpen) return;
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => {
      setCountdown((c) => (c === null ? null : c - 1));
    }, 700);
    return () => clearTimeout(t);
  }, [countdown, ready, tutorialOpen]);

  // 게임 루프 시작
  useEffect(() => {
    if (!ready || countdown !== null || tutorialOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    state.player.vy = JUMP_POWER;
    startedAtRef.current = performance.now();
    state.startedAt = startedAtRef.current;
    useGamePlayStore.setState({ gameStartTime: startedAtRef.current });

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
        // ignore storage errors
      }

      router.push(`/games/${gameId}/result`);
    };
    gameOverRef.current = handleGameOver;

    const loop = () => {
      const time = performance.now();
      const s = stateRef.current;
      if (s.isGameOver) return;
      if (pausedRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // 입력: 항상 한 방향으로 일정 속도 이동, 토글로 방향 전환
      s.player.vx = directionRef.current === 'right' ? MOVE_SPEED : -MOVE_SPEED;

      // 물리
      s.player.vy += GRAVITY;
      s.player.x += s.player.vx;
      s.player.y += s.player.vy;

      // 좌우 화면 래핑
      if (s.player.x + s.player.width < 0) s.player.x = CANVAS_WIDTH;
      if (s.player.x > CANVAS_WIDTH) s.player.x = -s.player.width;

      // 구름 이동(이동형)
      s.clouds.forEach((c) => {
        if (c.vx !== 0) {
          c.x += c.vx;
          if (c.x < 0) {
            c.x = 0;
            c.vx = -c.vx;
          } else if (c.x + c.width > CANVAS_WIDTH) {
            c.x = CANVAS_WIDTH - c.width;
            c.vx = -c.vx;
          }
        }
      });

      // 충돌 (착지)
      for (const cloud of s.clouds) {
        if (cloud.used && cloud.type === 'breakable') continue;
        if (checkLanding(s.player, cloud)) {
          const isTrampoline = cloud.type === 'trampoline';
          s.player.vy = isTrampoline ? TRAMPOLINE_POWER : JUMP_POWER;
          s.player.y = cloud.y - s.player.height;

          // 같은 구름 재착지 → 바운스만 발생, 점수·콤보·SFX 모두 스킵
          if (s.lastScoredCloudId === cloud.id) {
            break;
          }
          s.lastScoredCloudId = cloud.id;

          let baseScore = 20;
          let isItemBonus = false;
          if (cloud.type === 'trampoline') baseScore = 50;
          if (cloud.type === 'star') {
            baseScore = 100;
            isItemBonus = true;
          }
          if (cloud.type === 'breakable') baseScore = 25;
          if (cloud.type === 'moving') baseScore = 35;

          const prevCombo = useGamePlayStore.getState().comboCount;
          addScore(baseScore, { isItemBonus });

          // SFX + 햅틱
          if (cloud.type === 'trampoline') {
            audio.play('trampoline');
            vibrate('medium');
          } else if (cloud.type === 'star') {
            audio.play('star');
            vibrate('success');
          } else if (cloud.type === 'breakable') {
            audio.play('breakable');
            vibrate('light');
          } else {
            audio.play('jump');
            vibrate('light');
          }

          // 콤보 임계점 (5/10/20...) 시 추가 SFX/햅틱
          const newCombo = useGamePlayStore.getState().comboCount;
          if (
            newCombo > prevCombo &&
            newCombo >= 5 &&
            (newCombo % 5 === 0 || newCombo % 10 === 0)
          ) {
            audio.play('combo');
            vibrate('combo');
          }

          if (cloud.type === 'breakable') {
            cloud.broken = true;
            cloud.used = true;
          } else if (cloud.type === 'star') {
            cloud.used = true;
            cloud.broken = true;
          }

          break;
        }
      }

      // 카메라 스크롤 (캐릭터가 화면 상단에 도달하면 위로 따라감)
      const cameraThreshold = CANVAS_HEIGHT * 0.4;
      if (s.player.y < cameraThreshold) {
        const diff = cameraThreshold - s.player.y;
        s.player.y += diff;
        s.cameraY -= diff;
        s.clouds.forEach((c) => {
          c.y += diff;
        });
        s.fruits.forEach((f) => {
          f.y += diff;
        });
        s.spawnTopY += diff;
        s.highestY -= diff;
      }

      // 과일 충돌 (사방향 AABB)
      for (const fruit of s.fruits) {
        if (fruit.collected) continue;
        if (
          s.player.x < fruit.x + fruit.size &&
          s.player.x + s.player.width > fruit.x &&
          s.player.y < fruit.y + fruit.size &&
          s.player.y + s.player.height > fruit.y
        ) {
          fruit.collected = true;
          addScore(getFruitScore(fruit.type), { isItemBonus: true });
          audio.play('fruit');
          vibrate('light');
        }
      }

      // 화면 밖 + 수집된 과일 제거
      s.fruits = s.fruits.filter(
        (f) => !f.collected && f.y < CANVAS_HEIGHT + 100
      );

      // 화면 밖 구름 제거 + 새 구름 생성 (각 구름 위에 과일 스폰 시도)
      s.clouds = s.clouds.filter((c) => c.y < CANVAS_HEIGHT + 100);
      while (s.clouds.length < CLOUD_COUNT) {
        const gap =
          MIN_VERTICAL_GAP +
          Math.random() * (MAX_VERTICAL_GAP - MIN_VERTICAL_GAP);
        s.spawnTopY -= gap;
        // 가장 위 (가장 최근에 스폰된) 구름의 x를 기준으로 새 구름 위치 제약
        const topCloud = s.clouds.reduce((top, c) =>
          c.y < top.y ? c : top
        , s.clouds[0]);
        const newCloud = generateCloud(s.spawnTopY, s.level, topCloud?.x);
        s.clouds.push(newCloud);
        const fruit = maybeGenerateFruit(newCloud);
        if (fruit) s.fruits.push(fruit);
      }

      // 레벨업 체크
      const newLevel = levelFromHeight(s.highestY);
      if (newLevel !== s.level) {
        s.level = newLevel;
        setHudLevel(newLevel);
      }

      // 떨어짐 → 게임오버
      if (s.player.y > CANVAS_HEIGHT + 100) {
        gameOverRef.current();
        return;
      }

      // 렌더링
      drawScene(ctx, s, time);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [ready, countdown, tutorialOpen, addScore, characterId, gameId, router]);

  const bgGradientRef = useRef<CanvasGradient | null>(null);

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    s: GameState,
    time: number
  ) => {
    // 배경 그라데이션은 한 번만 만들어 재사용
    if (!bgGradientRef.current) {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#FFE0EC');
      grad.addColorStop(0.5, '#F0E1F7');
      grad.addColorStop(1, '#DCE9FF');
      bgGradientRef.current = grad;
    }
    ctx.fillStyle = bgGradientRef.current;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 배경 별/하트 (시차 스크롤)
    const parallax = (s.cameraY * 0.2) % 60;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < 8; i++) {
      const px = (i * 73) % CANVAS_WIDTH;
      const py = ((i * 91 + parallax) % CANVAS_HEIGHT + CANVAS_HEIGHT) % CANVAS_HEIGHT;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 구름들
    s.clouds.forEach((cloud) => drawCloud(ctx, cloud));

    // 과일들 (구름 위, 캐릭터 아래)
    s.fruits.forEach((fruit) => drawFruit(ctx, fruit, time));

    // 캐릭터
    let anim: 'idle' | 'walk' | 'jump' | 'hurt' = 'idle';
    if (s.player.vy < -2) anim = 'jump';
    else if (Math.abs(s.player.vx) > 1) anim = 'walk';
    if (time < s.player.hurtUntil) anim = 'hurt';

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
        directionRef.current === 'left'
      );
    } else {
      // 폴백: 핑크 원
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

  const drawFruit = (
    ctx: CanvasRenderingContext2D,
    fruit: Fruit,
    time: number
  ) => {
    if (fruit.collected) return;

    const bob = Math.sin(time / 350 + fruit.spawnPhase) * 3;
    const cx = fruit.x + fruit.size / 2;
    const cy = fruit.y + fruit.size / 2 + bob;

    // 후광
    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, fruit.size * 0.9);
    glow.addColorStop(0, 'rgba(255, 232, 154, 0.55)');
    glow.addColorStop(1, 'rgba(255, 232, 154, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, fruit.size * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 과일 이모지
    ctx.save();
    ctx.font = `${fruit.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getFruitEmoji(fruit.type), cx, cy);
    ctx.restore();
  };

  const drawCloud = (ctx: CanvasRenderingContext2D, cloud: Cloud) => {
    if (cloud.broken && cloud.type === 'star') return;

    const color = getCloudColor(cloud.type);
    ctx.save();
    if (cloud.type === 'breakable' && cloud.broken) {
      ctx.globalAlpha = 0.3;
    }

    // 본체
    ctx.fillStyle = color;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cloud.x, cloud.y, cloud.width, cloud.height, 12);
    } else {
      const r = 12;
      const x = cloud.x;
      const y = cloud.y;
      const w = cloud.width;
      const h = cloud.height;
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

    // 외곽선
    ctx.strokeStyle = 'rgba(74, 59, 82, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 타입별 데코
    if (cloud.type === 'trampoline') {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px DungGeunMo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♥', cloud.x + cloud.width / 2, cloud.y + cloud.height / 2);
    } else if (cloud.type === 'star') {
      ctx.fillStyle = '#FF6B6B';
      ctx.font = 'bold 12px DungGeunMo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', cloud.x + cloud.width / 2, cloud.y + cloud.height / 2);
    } else if (cloud.type === 'moving') {
      ctx.fillStyle = '#5BA0E0';
      ctx.font = 'bold 10px DungGeunMo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        cloud.vx > 0 ? '→' : '←',
        cloud.x + cloud.width / 2,
        cloud.y + cloud.height / 2
      );
    }

    ctx.restore();
  };

  const toggleDirection = () => {
    directionRef.current = directionRef.current === 'right' ? 'left' : 'right';
    audio.play('select');
    vibrate('light');
  };

  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    toggleDirection();
  };

  // 키보드 입력 (데스크톱) — 스페이스바만 사용
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) toggleDirection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
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
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="rounded-cute-lg shadow-xl bg-white"
          style={{
            width: '100%',
            maxWidth: `${CANVAS_WIDTH}px`,
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
            maxHeight: 'calc(100dvh - 110px)',
            touchAction: 'none',
          }}
        />

        <AbilityEffectOverlay />

        <PauseModal
          open={paused}
          onResume={() => {
            pausedRef.current = false;
            setPaused(false);
          }}
          gameName="구름 점프"
        />

        <TutorialOverlay
          gameId={gameId}
          onShow={() => setTutorialOpen(true)}
          onDismiss={() => setTutorialOpen(false)}
        />
        <AbilityIndicator />

        {/* 카운트다운 오버레이 */}
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
        터치 / 스페이스바로 방향 전환
      </div>
    </div>
  );
}
