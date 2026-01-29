import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
      fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    },
    pulseDot: {
      '0%, 80%, 100%': { transform: 'scale(0)' },
      '40%': { transform: 'scale(1)' },
    },
  },
  animation: {
    'fade-in': 'fadeIn 0.5s ease-in',
    'pulse-dot': 'pulseDot 1.4s infinite ease-in-out both',
  },
  },
  plugins: [],
};

export default config;

