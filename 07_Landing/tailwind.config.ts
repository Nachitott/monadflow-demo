import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        drift: 'drift 18s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0,0,0) scale(1)' },
          '100%': { transform: 'translate3d(0,-40px,0) scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;