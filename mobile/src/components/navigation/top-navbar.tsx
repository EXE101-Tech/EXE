import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { Bell, MessageCircle, Search } from 'lucide-react-native';
import { Image, TouchableOpacity, View } from 'react-native';
import { useUnreadCountQuery } from '@/hooks/queries/use-notifications';
import { ThemeToggleButton } from './theme-toggle-button';
import brandLogo from '../../../assets/images/icons/logo.png';

export function TopNavbar() {
  const unreadCount = useUnreadCountQuery();

  return (
    <View className="flex-row items-center gap-1.5 border-b border-[#DCE5DB] pb-3 pt-1 dark:border-white/10">
      <View className="flex-row items-center gap-1.5 pr-1">
        <Image source={brandLogo} className="h-8 w-8" resizeMode="contain" accessibilityLabel="SportGo" />
        <Text className="text-sm font-black text-[#17231D] dark:text-white">SportGo<Text className="text-[#80984B]">.</Text></Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/search')}
        className="h-9 min-w-0 flex-1 flex-row items-center gap-1.5 rounded-md border border-[#DCE5DB] bg-white px-2.5 dark:border-white/10 dark:bg-white/5"
      >
        <Search size={14} color="#6F8073" />
        <Text className="text-[11px] text-slate-400" numberOfLines={1}>
          Tìm kiếm...
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/chat')}
        hitSlop={8}
        accessibilityLabel="Mở chat"
        className="h-9 w-9 items-center justify-center rounded-md bg-white dark:bg-white/10"
      >
        <MessageCircle size={17} color="#52744A" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/notifications')}
        hitSlop={8}
        accessibilityLabel="Thông báo"
        className="h-9 w-9 items-center justify-center rounded-md bg-white dark:bg-white/10"
      >
        <Bell size={16} color="#52744A" />
        {unreadCount > 0 ? (
          <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        ) : null}
      </TouchableOpacity>

      <ThemeToggleButton />

    </View>
  );
}
