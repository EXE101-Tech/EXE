import { colorScheme, useColorScheme } from 'nativewind';
import { create } from 'zustand';

import { secureStorage } from '@/lib/secure-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme-preference';

// The web app opens in dark mode unless the user picked light, so mobile starts the same way.
const DEFAULT_PREFERENCE: ThemePreference = 'dark';
colorScheme.set(DEFAULT_PREFERENCE);

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: DEFAULT_PREFERENCE,
  setPreference: (preference) => {
    colorScheme.set(preference);
    set({ preference });
    secureStorage.setItemAsync(THEME_STORAGE_KEY, preference).catch(() => {});
  },
}));

/** Applies the theme the user chose in a previous session (if any). Safe to call once at startup. */
export async function hydrateTheme(): Promise<void> {
  try {
    const saved = await secureStorage.getItemAsync(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      colorScheme.set(saved);
      useThemeStore.setState({ preference: saved });
    }
  } catch {
    // Keep the default when storage is unavailable.
  }
}

/** Resolved 'light' | 'dark', following the device setting when preference is 'system'. */
export function useResolvedColorScheme() {
  const { colorScheme: resolved } = useColorScheme();
  return resolved ?? 'dark';
}
