/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Day Ops (Light Mode)
        'ops-bg-light': '#F5F5F5',
        'ops-surface-light': '#FFFFFF',
        'ops-text-light': '#1A1A1A',
        'ops-accent-light': '#3B82F6',
        // Night Ops (Dark Mode)
        'ops-bg-dark': '#0A0A0A',
        'ops-surface-dark': '#1A1A1A',
        'ops-text-dark': '#E5E5E5',
        'ops-accent-dark': '#10B981',
        // Neon colors for zones
        'neon-magenta': '#FF00FF',
        'neon-cyan': '#00FFFF',
        'neon-green': '#00FF00',
        'neon-orange': '#FF6600',
        'neon-purple': '#9D00FF',
        'neon-yellow': '#FFFF00',
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'anchor-lock': 'anchor-lock 0.6s ease-out',
        'terminal-blink': 'terminal-blink 1s step-end infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        'anchor-lock': {
          '0%': { transform: 'scale(1)', opacity: 0.5 },
          '50%': { transform: 'scale(1.5)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'terminal-blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
      },
    },
  },
  plugins: [],
};
