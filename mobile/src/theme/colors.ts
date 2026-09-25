// Single source of truth for brand colors used outside Tailwind utility classes
// (gradients, map markers, status bar, etc). Values must stay in sync with
// `tailwind.config.js`'s `theme.extend.colors` (duplicated there since that file
// runs under plain Node, not this TS/Metro pipeline).

export const colors = {
  light: {
    brand: '#0EA5E9',
    bg: '#F8FAFC',
    text: '#0F172A',
    surface: 'rgba(255,255,255,0.86)',
    border: 'rgba(100,155,190,0.2)',
    glow: 'rgba(14,165,233,0.3)',
    glowStrong: 'rgba(14,165,233,0.5)',
  },
  dark: {
    brand: '#65E6A0',
    bg: '#0B1220',
    text: '#EAF2FF',
    surface: 'rgba(16,32,56,0.86)',
    border: 'rgba(117,158,204,0.17)',
    glow: 'rgba(101,230,160,0.28)',
    glowStrong: 'rgba(101,230,160,0.48)',
  },
} as const;

/** Primary CTA gradient stops, used with expo-linear-gradient (not a Tailwind utility). */
export const ctaGradient = ['#74C365', '#589470'] as const;

export type ColorScheme = keyof typeof colors;
