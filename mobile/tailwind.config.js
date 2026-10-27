/** @type {import('tailwindcss').Config} */
// Color values here must stay in sync with `src/theme/colors.ts` (kept duplicated
// because this file runs under plain Node, not the TS/Metro pipeline).
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter_400Regular'],
        'inter-thin': ['Inter_100Thin'],
        'inter-extralight': ['Inter_200ExtraLight'],
        'inter-light': ['Inter_300Light'],
        'inter-normal': ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        'inter-extrabold': ['Inter_800ExtraBold'],
        'inter-black': ['Inter_900Black'],
      },
      colors: {
        brand: {
          DEFAULT: '#4e73ed',
          dark: '#537fff',
        },
        bg: {
          DEFAULT: '#f3f6fc',
          dark: '#080b14',
        },
        surface: {
          DEFAULT: 'rgba(255,255,255,0.9)',
          dark: 'rgba(17,24,39,0.86)',
        },
        border: {
          DEFAULT: 'rgba(35,52,82,0.12)',
          dark: 'rgba(174,196,236,0.11)',
        },
        cta: {
          from: '#6b94ff',
          to: '#4e73ed',
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
