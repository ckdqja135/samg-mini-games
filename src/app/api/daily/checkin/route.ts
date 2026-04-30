import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { checkInAttendance } from '@/lib/dailyMissions';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { attendance, isNewToday } = await checkInAttendance(session.userId);
  return NextResponse.json({
    date: attendance.date,
    streak: attendance.streak,
    isNewToday,
  });
}
