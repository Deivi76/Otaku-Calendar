/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'otaku-bg': '#0f0f0f',
        'otaku-bg-secondary': '#1a1a1a',
        'otaku-bg-tertiary': '#252525',
        'otaku-accent': '#ff6b35',
        'otaku-accent-hover': '#ff8c5a',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
