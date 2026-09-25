/** @type {import('tailwindcss').Config} */
// Color values here must stay in sync with `src/theme/colors.ts` (kept duplicated
// because this file runs under plain Node, not the TS/Metro pipeline).
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0EA5E9',
          dark: '#65E6A0',
        },
        bg: {
          DEFAULT: '#F8FAFC',
          dark: '#0B1220',
        },
        surface: {
          DEFAULT: 'rgba(255,255,255,0.86)',
          dark: 'rgba(16,32,56,0.86)',
        },
        border: {
          DEFAULT: 'rgba(100,155,190,0.2)',
          dark: 'rgba(117,158,204,0.17)',
        },
        cta: {
          from: '#74C365',
          to: '#589470',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
