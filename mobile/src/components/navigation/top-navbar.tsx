import { Text } from '@/components/ui/text';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Crown, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { useUnreadCountQuery } from '@/hooks/queries/use-notifications';
import { NotificationsPopup } from './notifications-popup';
import { ThemeToggleButton } from './theme-toggle-button';

const LOGO = require('../../../assets/images/logo.png');

export function TopNavbar() {
  const unreadCount = useUnreadCountQuery();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <View className="flex-row items-center gap-2 pb-3 pt-1">
      <TouchableOpacity
        onPress={() => router.navigate('/(tabs)/forum')}
        accessibilityLabel="SportGo, về cộng đồng"
        hitSlop={6}
      >
        <Image source={LOGO} style={{ width: 30, height: 34 }} resizeMode="contain" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/search')}
        className="h-9 flex-1 flex-row items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 dark:border-border-dark dark:bg-white/5"
      >
        <Search size={14} color="#94A3B8" />
        <Text className="text-xs text-slate-400" numberOfLines={1}>
          Tìm người chơi, CLB, phòng…
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.navigate('/(tabs)/premium')}
        accessibilityLabel="SportGo Premium"
        hitSlop={6}
        className="overflow-hidden rounded-full"
      >
        <LinearGradient
          colors={['#5942a1', '#2b72a5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Crown size={16} color="#f0eaff" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setNotificationsOpen(true)}
        hitSlop={8}
        accessibilityLabel="Thông báo"
        className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
      >
        <Bell size={16} color="#64748B" />
        {unreadCount > 0 ? (
          <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        ) : null}
      </TouchableOpacity>

      <ThemeToggleButton />

      <NotificationsPopup visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </View>
  );
}
