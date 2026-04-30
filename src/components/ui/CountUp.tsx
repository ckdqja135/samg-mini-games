'use client';

import { useEffect, useState } from 'react';

interface CountUpProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function CountUp({
  from = 0,
  to,
  duration = 1200,
  className,
  formatter = (v) => v.toLocaleString(),
}: CountUpProps) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (to === from) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, duration]);

  return <span className={className}>{formatter(value)}</span>;
}
