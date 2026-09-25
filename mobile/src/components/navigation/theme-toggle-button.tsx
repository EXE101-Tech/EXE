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
      className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
    >
      {isDark ? <Sun size={17} color="#65E6A0" /> : <Moon size={17} color="#0EA5E9" />}
    </TouchableOpacity>
  );
}
