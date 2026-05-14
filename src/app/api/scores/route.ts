import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import {
  isRateLimited,
  PER_GAME_MAX_SCORE,
  PER_GAME_MAX_SCORE_PER_SEC,
  PER_GAME_MIN_DURATION_MS,
  PER_GAME_MAX_DURATION_MS,
} from '@/lib/scoreLimits';
import { verifyGameSessionToken } from '@/lib/gameSession';
import {
  validateScoreEvents,
  type ScoreEvent,
} from '@/lib/scoreEventValidation';
import { kstDateString } from '@/lib/dateUtils';
import type { SubmitScoreRequest, SubmitScoreResponse } from '@/types/score';

const HARD_MAX = 1_000_000;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isRateLimited(session.userId)) {
    return NextResponse.json(
      { error: '너무 빠르게 등록했어요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  let body: Partial<SubmitScoreRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    gameId,
    characterId,
    score,
    maxCombo,
    abilityActivations,
    sessionToken,
    events,
    untrustedInputs,
    totalInputs,
    automationFlags,
  } = body;

  if (
    typeof gameId !== 'string' ||
    typeof characterId !== 'string' ||
    typeof score !== 'number' ||
    typeof maxCombo !== 'number' ||
    typeof abilityActivations !== 'number' ||
    typeof sessionToken !== 'string' ||
    !Array.isArray(events) ||
    typeof untrustedInputs !== 'number' ||
    typeof totalInputs !== 'number'
  ) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // 자동화 플래그 — navigator.webdriver = true 면 거부
  // (Selenium/Puppeteer 등 초보 자동화. stealth 우회 가능하지만 무료 허들)
  if (automationFlags && automationFlags.webdriver === true) {
    return NextResponse.json(
      { error: '자동화 환경이 감지되었습니다' },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(score) ||
    score < 0 ||
    score > HARD_MAX ||
    maxCombo < 0 ||
    abilityActivations < 0 ||
    untrustedInputs < 0 ||
    totalInputs < 0
  ) {
    return NextResponse.json({ error: 'Invalid values' }, { status: 400 });
  }

  // 1) 세션 토큰 검증 — 가장 먼저
  const tokenPayload = await verifyGameSessionToken(sessionToken);
  if (!tokenPayload) {
    return NextResponse.json(
      { error: '세션 토큰이 유효하지 않습니다' },
      { status: 401 }
    );
  }
  if (
    tokenPayload.userId !== session.userId ||
    tokenPayload.gameId !== gameId ||
    tokenPayload.characterId !== characterId
  ) {
    return NextResponse.json(
      { error: '세션 정보가 일치하지 않습니다' },
      { status: 400 }
    );
  }

  // 2) DB 세션 조회 + 상태 검증 (재제출 방지)
  const gameSession = await prisma.gameSession.findUnique({
    where: { id: tokenPayload.sessionId },
  });
  if (!gameSession) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
  }
  if (gameSession.status !== 'active') {
    return NextResponse.json(
      { error: '이미 제출되었거나 만료된 세션입니다' },
      { status: 409 }
    );
  }
  if (
    gameSession.userId !== session.userId ||
    gameSession.gameId !== gameId ||
    gameSession.nonce !== tokenPayload.nonce
  ) {
    return NextResponse.json(
      { error: '세션 정보 불일치' },
      { status: 400 }
    );
  }

  // 3) 서버 기준 duration 강제 계산 — 클라이언트 값 신뢰 X
  const durationMs = Date.now() - gameSession.startedAt.getTime();
  const minDuration = PER_GAME_MIN_DURATION_MS[gameId] ?? 1_000;
  const maxDuration = PER_GAME_MAX_DURATION_MS[gameId] ?? 20 * 60_000;
  if (durationMs < minDuration) {
    await prisma.gameSession.update({
      where: { id: gameSession.id },
      data: { status: 'rejected', completedAt: new Date() },
    });
    return NextResponse.json(
      { error: '플레이 시간이 너무 짧습니다' },
      { status: 400 }
    );
  }
  if (durationMs > maxDuration) {
    await prisma.gameSession.update({
      where: { id: gameSession.id },
      data: { status: 'expired', completedAt: new Date() },
    });
    return NextResponse.json(
      { error: '세션이 만료되었습니다' },
      { status: 410 }
    );
  }

  // 4) 게임별 max score / score-rate 검증
  const perGameMax = PER_GAME_MAX_SCORE[gameId];
  if (perGameMax && score > perGameMax) {
    await prisma.gameSession.update({
      where: { id: gameSession.id },
      data: { status: 'rejected', completedAt: new Date() },
    });
    return NextResponse.json(
      { error: '비정상적인 점수입니다' },
      { status: 400 }
    );
  }
  if (PER_GAME_MAX_SCORE_PER_SEC[gameId]) {
    const ratePerSec = score / (durationMs / 1000);
    if (ratePerSec > PER_GAME_MAX_SCORE_PER_SEC[gameId]) {
      await prisma.gameSession.update({
        where: { id: gameSession.id },
        data: { status: 'rejected', completedAt: new Date() },
      });
      return NextResponse.json(
        { error: '비정상적인 점수율입니다' },
        { status: 400 }
      );
    }
  }

  // 5) 이벤트 로그 검증 — 봇/익스텐션 탐지
  const eventValidation = validateScoreEvents({
    gameId,
    durationMs,
    score,
    events: events as ScoreEvent[],
    untrustedInputs,
    totalInputs,
  });
  if (!eventValidation.ok) {
    await prisma.gameSession.update({
      where: { id: gameSession.id },
      data: { status: 'rejected', completedAt: new Date() },
    });
    return NextResponse.json(
      { error: eventValidation.reason || '비정상적인 입력 패턴' },
      { status: 400 }
    );
  }

  // 6) 등록
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const previousBest = await prisma.score.aggregate({
    where: { userId: session.userId, gameId },
    _max: { score: true },
  });

  const previousBestScore = previousBest._max.score ?? 0;
  const finalScore = Math.floor(score);
  const finalMaxCombo = Math.floor(maxCombo);
  const finalAbilityCount = Math.floor(abilityActivations);
  const isNewRecord = finalScore > previousBestScore;

  // 세션과 점수 등록을 트랜잭션으로 묶어 재제출 race 차단
  try {
    await prisma.$transaction([
      prisma.score.create({
        data: {
          userId: session.userId,
          gameId,
          characterId,
          score: finalScore,
          maxCombo: finalMaxCombo,
          abilityActivations: finalAbilityCount,
          sessionId: gameSession.id,
        },
      }),
      prisma.gameSession.update({
        where: { id: gameSession.id },
        data: { status: 'submitted', completedAt: new Date() },
      }),
    ]);
  } catch (err) {
    // unique 충돌 = 재제출
    console.error('score submit failed:', err);
    return NextResponse.json(
      { error: '점수 등록에 실패했습니다' },
      { status: 409 }
    );
  }

  // 일일 미션 진행도 갱신 (실패해도 점수 등록은 성공으로)
  try {
    await updateDailyChallenges(session.userId, finalScore, finalMaxCombo);
  } catch (err) {
    console.error('updateDailyChallenges failed:', err);
  }

  // 등수 계산
  const allBests = await prisma.score.groupBy({
    by: ['userId'],
    where: { gameId },
    _max: { score: true },
  });

  const sorted = allBests
    .map((b) => ({ userId: b.userId, score: b._max.score ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const rank = sorted.findIndex((b) => b.userId === session.userId) + 1;
  const top5Updated = isNewRecord && rank > 0 && rank <= 5;

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games/${gameId}/ranking`);

  const response: SubmitScoreResponse = {
    rank,
    isNewRecord,
    top5Updated,
  };

  return NextResponse.json(response);
}

async function updateDailyChallenges(
  userId: string,
  scoreThisPlay: number,
  comboThisPlay: number
) {
  const date = kstDateString();
  const challenges = await prisma.dailyChallenge.findMany({
    where: { userId, date },
  });
  if (challenges.length === 0) return;

  for (const c of challenges) {
    if (c.completed) continue;
    let newProgress = c.progress;
    if (c.type === 'play_games') {
      newProgress = c.progress + 1;
    } else if (c.type === 'total_score') {
      newProgress = c.progress + scoreThisPlay;
    } else if (c.type === 'max_combo') {
      newProgress = Math.max(c.progress, comboThisPlay);
    }
    const completed = newProgress >= c.target;
    if (newProgress !== c.progress || completed !== c.completed) {
      await prisma.dailyChallenge.update({
        where: { id: c.id },
        data: { progress: newProgress, completed },
      });
    }
  }
}
