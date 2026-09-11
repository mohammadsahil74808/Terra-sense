/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ts: {
          base: 'var(--ts-base, #0F141C)',
          surface1: 'var(--ts-surface-1, #151C28)',
          surface2: 'var(--ts-surface-2, #1C2433)',
          border: 'var(--ts-border, #283548)',
          borderMuted: 'var(--ts-border-muted, #334155)',
          text: 'var(--ts-text, #CBD5E1)',
          text2: 'var(--ts-text-2, #94A3B8)',
          text3: 'var(--ts-text-3, #64748B)',
          accent: 'var(--ts-accent, #6C7CFF)',
          accentDim: 'var(--ts-accent-dim, #505EDB)',
          accentFaint: 'var(--ts-accent-faint, rgba(108, 124, 255, 0.12))',
        },
        surface: {
          0: 'var(--ts-base, #0F141C)',
          1: 'var(--ts-surface-1, #151C28)',
          2: 'var(--ts-surface-2, #1C2433)',
          3: 'var(--ts-border, #283548)',
        },
        risk: {
          high: '#EF4444',
          moderate: '#F97316',
          low: '#22C55E',
        },
        brand: {
          accent: '#6C7CFF',
          'accent-dim': '#505EDB',
          'accent-faint': 'rgba(108, 124, 255, 0.12)',
          cyan: '#22D3EE',
          'cyan-dim': '#0891B2',
          'cyan-muted': '#164E63',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'ts-panel': 'var(--ts-panel-shadow)',
        'ts-panel-hover': 'var(--ts-panel-shadow-hover)',
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.15)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.15)',
        'glow-orange': '0 0 20px rgba(249, 115, 22, 0.15)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.15)',
      },
    },
  },
  plugins: [],
}
