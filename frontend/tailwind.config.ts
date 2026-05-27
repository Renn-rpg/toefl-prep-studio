import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Noto Serif SC"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          950: '#0C0A09',
          900: '#1C1917',
          800: '#292524',
          700: '#44403C',
          600: '#57534E',
        },
        accent: {
          blue: '#0F766E',
          amber: '#D97706',
          emerald: '#059669',
          rose: '#E11D48',
        },
        parchment: '#F5F1EB',
        'warm-white': '#FEFDFB',
      },
      boxShadow: {
        card: '0 1px 3px rgba(28,25,23,0.05), 0 6px 16px rgba(28,25,23,0.04)',
        'card-hover': '0 8px 24px rgba(28,25,23,0.08), 0 2px 6px rgba(28,25,23,0.04)',
        glow: '0 0 24px rgba(15,118,110,0.12)',
      },
      backgroundImage: {
        'grid-paper': `
          linear-gradient(rgba(15,118,110,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(15,118,110,0.03) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-paper': '24px 24px',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease both',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
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
      },
    },
  },
  plugins: [],
}

export default config
