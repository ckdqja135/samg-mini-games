import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary-pink': '#FF8FB1',
        'soft-pink': '#FFD6E5',
        'cream': '#FFF5F8',
        'lavender': '#E8D5F2',
        'mint': '#B5E8D5',
        'sky': '#C5E5FF',
        'pastel-yellow': '#FFE89A',
        'text-dark': '#4A3B52',
        'text-light': '#8B7B92',
      },
      fontFamily: {
        sans: ['Pretendard', 'Noto Sans KR', 'sans-serif'],
        pixel: ['DungGeunMo', 'Galmuri11', 'monospace'],
      },
      borderRadius: {
        'cute': '16px',
        'cute-lg': '24px',
      },
      boxShadow: {
        'cute': '0 4px 0 #E66B92',
        'cute-purple': '0 4px 0 #A78BFA',
        'cute-mint': '0 4px 0 #10B981',
      },
      animation: {
        'sparkle': 'sparkle 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        sparkle: {
          '0%, 100%': { opacity: '0', transform: 'scale(0)' },
          '50%': { opacity: '1', transform: 'scale(1) rotate(180deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
