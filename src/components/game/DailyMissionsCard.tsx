'use client';

import { useEffect, useState } from 'react';

interface Mission {
  type: string;
  title: string;
  description: string;
  iconEmoji: string;
  target: number;
  progress: number;
  completed: boolean;
}

interface DailyData {
  date: string;
  missions: Mission[];
  attendance: { date: string; streak: number } | null;
}

export function DailyMissionsCard() {
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/daily/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const completedCount = data.missions.filter((m) => m.completed).length;

  return (
    <div className="card-cute">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel text-sm text-text-dark">📅 오늘의 미션</h3>
        <span className="text-xs text-text-light font-pixel">
          {completedCount}/{data.missions.length} 완료
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {data.missions.map((m) => {
          const pct = Math.min(100, (m.progress / m.target) * 100);
          return (
            <div
              key={m.type}
              className={`px-3 py-2 rounded-cute ${
                m.completed
                  ? 'bg-gradient-to-r from-yellow-100 to-pink-100 border border-yellow-300'
                  : 'bg-white/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{m.iconEmoji}</span>
                <span className="flex-1 font-pixel text-xs text-text-dark">
                  {m.title}
                </span>
                {m.completed ? (
                  <span className="text-yellow-600 font-pixel text-xs">✓ 완료!</span>
                ) : (
                  <span className="text-xs text-text-light font-pixel">
                    {Math.min(m.progress, m.target).toLocaleString()}/
                    {m.target.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-pink to-soft-pink transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
