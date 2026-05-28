import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Sora"', '"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        surface: {
          0: '#16161E',
          50: '#1C1C27',
          100: '#232330',
          200: '#2A2A3A',
          300: '#343445',
          400: '#3E3E50',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        module: {
          listening: '#06B6D4',
          reading: '#10B981',
          speaking: '#8B5CF6',
          writing: '#F59E0B',
          vocab: '#EC4899',
          plan: '#6366F1',
          mock: '#EF4444',
          evaluation: '#14B8A6',
        },
      },
      boxShadow: {
        glass: '0 4px 24px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)',
        'glass-hover': '0 8px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.20)',
        'glass-lg': '0 12px 48px rgba(0,0,0,0.40), 0 4px 12px rgba(0,0,0,0.25)',
        glow: '0 0 40px rgba(99,102,241,0.18)',
        'glow-pink': '0 0 40px rgba(236,72,153,0.15)',
        'glow-cyan': '0 0 40px rgba(6,182,212,0.15)',
        'glow-emerald': '0 0 40px rgba(16,185,129,0.15)',
        'glow-violet': '0 0 40px rgba(139,92,246,0.15)',
        'glow-amber': '0 0 40px rgba(245,158,11,0.15)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease both',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'card-flip': 'cardFlip 0.6s ease forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'orb-drift': 'orbDrift 20s ease-in-out infinite',
        'orb-drift-reverse': 'orbDriftReverse 25s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        cardFlip: {
          from: { transform: 'rotateY(0deg)' },
          to: { transform: 'rotateY(180deg)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        orbDrift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 15px) scale(0.95)' },
        },
        orbDriftReverse: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-25px, 20px) scale(0.97)' },
          '66%': { transform: 'translate(15px, -25px) scale(1.03)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
