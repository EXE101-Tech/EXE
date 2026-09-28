import { Moon, Sun } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

import { useResolvedColorScheme, useThemeStore } from '@/stores/theme-store';

export function ThemeToggleButton() {
  const scheme = useResolvedColorScheme();
  const setPreference = useThemeStore((s) => s.setPreference);
  const isDark = scheme === 'dark';

  return (
    <TouchableOpacity
      onPress={() => setPreference(isDark ? 'light' : 'dark')}
      hitSlop={8}
      className="h-9 w-9 items-center justify-center rounded-md bg-white dark:bg-white/10"
    >
      {isDark ? <Sun size={17} color="#D3EB5E" /> : <Moon size={17} color="#52744A" />}
    </TouchableOpacity>
  );
}
