/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium Dark Theme
        'otaku-bg': '#050505',
        'otaku-bg-secondary': '#0a0a0a',
        'otaku-bg-tertiary': '#121212',
        'otaku-bg-elevated': '#1a1a1a',
        'otaku-text': '#fafafa',
        'otaku-text-secondary': '#a1a1a1',
        'otaku-text-muted': '#525252',
        
        // Accent - Fierce Orange
        'otaku-accent': '#ff4d00',
        'otaku-accent-hover': '#ff6b3d',
        'otaku-accent-muted': 'rgba(255, 77, 0, 0.2)',
        
        // Semantic
        'otaku-success': '#00d67d',
        'otaku-warning': '#ffbe0b',
        'otaku-error': '#ff4757',
        
        // Genre Colors
        'otaku-rumor': '#c026d3',
        'otaku-announcement': '#3b82f6',
        'otaku-live-action': '#f43f5e',
        'otaku-shonen': '#f97316',
        'otaku-shojo': '#ec4899',
        'otaku-isekai': '#8b5cf6',
        'otaku-mecha': '#06b6d4',
        
        // Border
        'otaku-border': '#262626',
        'otaku-border-hover': '#404040',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 40px -10px #ff4d00',
        'glow-intense': '0 0 60px -20px #ff4d00',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px #ff4d00' },
          '50%': { boxShadow: '0 0 20px #ff4d00' },
        },
      },
    },
  },
  plugins: [],
}