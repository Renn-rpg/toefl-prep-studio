import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          950: '#070C18',
          900: '#0B1120',
          800: '#111827',
          700: '#1a2540',
          600: '#243050',
        },
        accent: {
          blue: '#3B82F6',
          amber: '#F59E0B',
          emerald: '#10B981',
          rose: '#F43F5E',
        },
        parchment: '#F8F7F4',
      },
      backgroundImage: {
        'grid-paper': `
          linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-paper': '24px 24px',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'count-up': 'countUp 0.8s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
