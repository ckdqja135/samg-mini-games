import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  ensureTodaysChallenges,
  TODAYS_MISSIONS,
} from '@/lib/dailyMissions';
import { prisma } from '@/lib/prisma';
import { kstDateString } from '@/lib/dateUtils';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const challenges = await ensureTodaysChallenges(session.userId);
  const today = kstDateString();
  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.userId, date: today } },
  });

  return NextResponse.json({
    date: today,
    missions: challenges.map((c) => {
      const def = TODAYS_MISSIONS.find((m) => m.type === c.type);
      return {
        type: c.type,
        title: def?.title ?? c.type,
        description: def?.description ?? '',
        iconEmoji: def?.iconEmoji ?? '🎯',
        target: c.target,
        progress: c.progress,
        completed: c.completed,
      };
    }),
    attendance: attendance
      ? { date: attendance.date, streak: attendance.streak }
      : null,
  });
}
