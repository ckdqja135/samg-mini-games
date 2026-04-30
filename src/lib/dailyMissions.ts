import { prisma } from '@/lib/prisma';
import { kstDateString, previousDayString } from '@/lib/dateUtils';

export type ChallengeType = 'play_games' | 'total_score' | 'max_combo';

export interface MissionDef {
  type: ChallengeType;
  target: number;
  title: string;
  description: string;
  iconEmoji: string;
}

export const TODAYS_MISSIONS: MissionDef[] = [
  {
    type: 'play_games',
    target: 3,
    title: '오늘 3회 플레이',
    description: '아무 미니게임이나 3번 플레이해보세요',
    iconEmoji: '🎮',
  },
  {
    type: 'total_score',
    target: 1000,
    title: '오늘 1000점 모으기',
    description: '오늘 누적 점수 1000점 이상',
    iconEmoji: '🏆',
  },
  {
    type: 'max_combo',
    target: 10,
    title: '10콤보 달성',
    description: '한 게임에서 10콤보 이상 기록',
    iconEmoji: '🔥',
  },
];

/** 오늘의 미션 행을 보장. 이미 있으면 그대로 반환. */
export async function ensureTodaysChallenges(userId: string) {
  const date = kstDateString();
  const existing = await prisma.dailyChallenge.findMany({
    where: { userId, date },
  });
  const existingTypes = new Set(existing.map((c) => c.type));

  const toCreate = TODAYS_MISSIONS.filter((m) => !existingTypes.has(m.type));
  if (toCreate.length > 0) {
    await prisma.dailyChallenge.createMany({
      data: toCreate.map((m) => ({
        userId,
        date,
        type: m.type,
        target: m.target,
        progress: 0,
        completed: false,
      })),
    });
  }

  return prisma.dailyChallenge.findMany({
    where: { userId, date },
  });
}

/** 출석 체크 — 새로 만들면 streak 계산해 반환. 이미 있으면 기존 row. */
export async function checkInAttendance(userId: string) {
  const today = kstDateString();

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  if (existing) {
    return { attendance: existing, isNewToday: false };
  }

  // 어제 출석 여부로 streak 계산
  const yesterday = previousDayString(today);
  const yest = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: yesterday } },
  });

  const streak = yest ? yest.streak + 1 : 1;
  const created = await prisma.attendance.create({
    data: { userId, date: today, streak },
  });
  return { attendance: created, isNewToday: true };
}
