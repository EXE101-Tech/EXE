import { router } from 'expo-router';
import { Bell, Search, Zap } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import { useUnreadCountQuery } from '@/hooks/queries/use-notifications';
import { ThemeToggleButton } from './theme-toggle-button';

export function TopNavbar() {
  const unreadCount = useUnreadCountQuery();

  return (
    <View className="flex-row items-center gap-2 pb-3 pt-1">
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand-dark/10">
        <Zap size={16} color="#0EA5E9" fill="#0EA5E9" />
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/search')}
        className="h-9 flex-1 flex-row items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 dark:border-border-dark dark:bg-white/5"
      >
        <Search size={14} color="#94A3B8" />
        <Text className="text-xs text-slate-400" numberOfLines={1}>
          Tìm kiếm...
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/notifications')}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
      >
        <Bell size={16} color="#64748B" />
        {unreadCount > 0 ? (
          <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        ) : null}
      </TouchableOpacity>

      <ThemeToggleButton />
    </View>
  );
}
