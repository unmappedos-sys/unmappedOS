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
        // Tactical OS Color System - Cinematic HUD Theme
        ops: {
          // Night Ops (Dark Mode - Primary)
          'night-bg': '#000000',
          'night-surface': '#0A0A0A',
          'night-border': '#1A1A1A',
          'night-text': '#E5E5E5',
          'night-muted': '#A0A0A0',  // Lightened from #666666 for better contrast
          
          // Day Ops (High Contrast Blueprint)
          'day-bg': '#F5F3ED',
          'day-surface': '#FFFFFF',
          'day-border': '#2C2416',
          'day-text': '#1A1A1A',
          'day-muted': '#8B7355',
          
          // Neon Accent System (Mission Critical)
          'neon-green': '#00FF41',
          'neon-cyan': '#00F5FF',
          'neon-magenta': '#FF10F0',
          'neon-amber': '#FFB000',
          'neon-red': '#FF0040',
          
          // Functional States
          'active': '#00FF41',
          'warning': '#FFB000',
          'critical': '#FF0040',
          'ghost': '#999999',  // Lightened from #666666 for better visibility
        },
        
        // Zone Texture Colors (Neon System)
        texture: {
          commercial: '#FF00FF',
          residential: '#00FFFF',
          transit: '#00FF00',
          cultural: '#9D00FF',
          waterfront: '#0080FF',
          industrial: '#FF6600',
          mixed: '#FFFF00',
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        tactical: ['JetBrains Mono', 'monospace'],
      },
      
      fontSize: {
        'tactical-xs': ['0.9375rem', { lineHeight: '1.375rem', letterSpacing: '0.05em', fontWeight: '500' }],   // 15px
        'tactical-sm': ['1.0625rem', { lineHeight: '1.625rem', letterSpacing: '0.05em', fontWeight: '500' }],  // 17px
        'tactical-base': ['1.1875rem', { lineHeight: '1.875rem', letterSpacing: '0.025em', fontWeight: '500' }], // 19px
        'tactical-lg': ['1.375rem', { lineHeight: '2.125rem', letterSpacing: '0.025em', fontWeight: '500' }],  // 22px
        'tactical-xl': ['1.625rem', { lineHeight: '2.375rem', letterSpacing: '0.05em', fontWeight: '600' }],   // 26px
        'tactical-2xl': ['2rem', { lineHeight: '2.625rem', letterSpacing: '0.075em', fontWeight: '600' }],     // 32px
        'tactical-3xl': ['2.5rem', { lineHeight: '3rem', letterSpacing: '0.1em', fontWeight: '600' }],         // 40px
      },
      
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'boot': 'boot 0.3s ease-out',
        'slide-in': 'slide-in 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'lock': 'lock 0.6s ease-out',
        'glitch': 'glitch 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
        'breathing': 'breathing 4s ease-in-out infinite',
      },
      
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 8px currentColor)' },
          '50%': { opacity: '0.7', filter: 'drop-shadow(0 0 12px currentColor)' },
        },
        'breathing': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 65, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 255, 65, 0.8)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '41.99%': { opacity: '1' },
          '42%': { opacity: '0' },
          '43%': { opacity: '0' },
          '43.01%': { opacity: '1' },
          '47.99%': { opacity: '1' },
          '48%': { opacity: '0' },
          '49%': { opacity: '0' },
          '49.01%': { opacity: '1' },
        },
        'boot': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'lock': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'glitch': {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
      },
      
      boxShadow: {
        'neon-sm': '0 0 10px currentColor',
        'neon': '0 0 20px currentColor',
        'neon-lg': '0 0 30px currentColor',
        'tactical': '0 2px 8px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'hud': '0 0 40px rgba(0, 255, 65, 0.2), 0 4px 12px rgba(0, 0, 0, 0.6)',
      },
      
      backdropBlur: {
        'tactical': '12px',
      },
      
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,255,65,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.03) 1px, transparent 1px)',
        'scan-line': 'repeating-linear-gradient(0deg, rgba(0,255,65,0.03), rgba(0,255,65,0.03) 1px, transparent 1px, transparent 2px)',
        'blueprint': 'linear-gradient(rgba(44,36,22,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(44,36,22,0.03) 1px, transparent 1px)',
      },
      
      backgroundSize: {
        'grid': '50px 50px',
        'blueprint': '40px 40px',
      },
    },
  },
  plugins: [],
};
