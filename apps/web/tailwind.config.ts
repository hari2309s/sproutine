import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        truffle: {
          bg: 'var(--t-bg)',
          surface: 'var(--t-surface)',
          card: 'var(--t-card)',
          border: 'var(--t-border)',
          muted: 'var(--t-muted)',
          text: 'var(--t-text)',
          'text-secondary': 'var(--t-text-secondary)',
          amber: 'var(--t-amber)',
          'amber-light': 'var(--t-amber-light)',
          green: 'var(--t-green)',
          red: 'var(--t-red)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounce 1.5s infinite',
        'spin-once': 'spin 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
}

export default config
