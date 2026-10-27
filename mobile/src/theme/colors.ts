// Single source of truth for brand colors used outside Tailwind utility classes
// (gradients, map markers, status bar, etc). Values must stay in sync with
// `tailwind.config.js`'s `theme.extend.colors` (duplicated there since that file
// runs under plain Node, not this TS/Metro pipeline).

export const colors = {
  light: {
    brand: '#4e73ed',
    bg: '#f3f6fc',
    text: '#172033',
    surface: 'rgba(255,255,255,0.9)',
    border: 'rgba(35,52,82,0.12)',
    glow: 'rgba(83,127,255,0.3)',
    glowStrong: 'rgba(83,127,255,0.5)',
  },
  dark: {
    brand: '#537fff',
    bg: '#080b14',
    text: '#f5f7fc',
    surface: 'rgba(17,24,39,0.86)',
    border: 'rgba(174,196,236,0.11)',
    glow: 'rgba(83,127,255,0.28)',
    glowStrong: 'rgba(83,127,255,0.48)',
  },
} as const;

/** Primary CTA gradient stops, used with expo-linear-gradient (not a Tailwind utility). */
export const ctaGradient = ['#6b94ff', '#4e73ed'] as const;

export type ColorScheme = keyof typeof colors;
