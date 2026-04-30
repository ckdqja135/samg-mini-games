'use client';

interface SparkleEffectProps {
  count?: number;
  className?: string;
}

export function SparkleEffect({ count = 6, className = '' }: SparkleEffectProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute text-yellow-300 animate-sparkle text-lg"
          style={{
            left: `${(i * 37 + 10) % 90}%`,
            top: `${(i * 53 + 15) % 80}%`,
            animationDelay: `${i * 0.3}s`,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
