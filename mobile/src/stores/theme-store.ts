import { colorScheme, useColorScheme } from 'nativewind';
import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  setPreference: (preference) => {
    colorScheme.set(preference);
    set({ preference });
  },
}));

/** Resolved 'light' | 'dark', following the device setting when preference is 'system'. */
export function useResolvedColorScheme() {
  const { colorScheme: resolved } = useColorScheme();
  return resolved ?? 'light';
}
