'use client';

import { useEffect, useRef, useState } from 'react';

interface ConfettiProps {
  count?: number;
  durationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle';
}

const COLORS = [
  '#FF8FB1',
  '#FFD6E5',
  '#FFE89A',
  '#B5E8D5',
  '#C5E5FF',
  '#E8D5F2',
];

export function Confetti({ count = 80, durationMs = 2500 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    const dpr = window.devicePixelRatio;

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 100,
      y: h * 0.25,
      vx: (Math.random() - 0.5) * 8,
      vy: -6 - Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() < 0.6 ? 'rect' : 'circle',
    }));

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);

      const fade = Math.max(0, 1 - elapsed / durationMs);

      particles.forEach((p) => {
        p.vy += 0.25; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (elapsed < durationMs) {
        raf = requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, durationMs]);

  if (done) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-50"
      aria-hidden
    />
  );
}
