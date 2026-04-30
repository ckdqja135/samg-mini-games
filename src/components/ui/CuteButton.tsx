'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'success';

interface CuteButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  fullWidth?: boolean;
  withSparkle?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-[#FF8FB1] to-[#FFB5D0] shadow-cute',
  secondary:
    'bg-gradient-to-br from-[#C5B6E8] to-[#E0D5F5] shadow-cute-purple',
  success:
    'bg-gradient-to-br from-[#82D9B5] to-[#B5E8D5] shadow-cute-mint',
};

export function CuteButton({
  children,
  variant = 'primary',
  fullWidth = false,
  withSparkle = false,
  className = '',
  ...rest
}: CuteButtonProps) {
  return (
    <button
      className={`
        ${variantClasses[variant]}
        text-white font-bold
        px-6 py-3 rounded-cute-lg
        transform transition-all
        active:translate-y-1 active:shadow-none
        relative
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
      {withSparkle && (
        <span className="absolute top-1 right-2 text-yellow-200 text-sm">✨</span>
      )}
    </button>
  );
}
