import { Text } from '@/components/ui/text';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gamepad2, MessageSquarePlus, Plus, UserRound, Users } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import communityIcon from '../../../assets/images/icons/diendan.png';
import matchesIcon from '../../../assets/images/icons/phonggame.png';
import teamsIcon from '../../../assets/images/icons/teams.png';

const ITEMS = [
  { routeName: 'forum', href: '/(tabs)/forum' as Href, label: 'Cộng đồng', icon: communityIcon },
  { routeName: 'gamerooms', href: '/(tabs)/gamerooms' as Href, label: 'Phòng game', icon: matchesIcon },
  { routeName: 'teams', href: '/(tabs)/teams' as Href, label: 'CLB', icon: teamsIcon },
];

const CREATE_ITEMS = [
  { label: 'Bài viết', route: '/(tabs)/forum' as Href, create: 'post', icon: MessageSquarePlus, x: -94, y: -52 },
  { label: 'Phòng game', route: '/(tabs)/gamerooms' as Href, create: 'room', icon: Gamepad2, x: 0, y: -104 },
  { label: 'CLB', route: '/(tabs)/teams' as Href, create: 'club', icon: Users, x: 94, y: -52 },
];

export function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const activeName = pathname.split('/').filter(Boolean).at(-1);
  const user = useAuthStore((state) => state.user);
  const avatarUrl = user?.profile?.avatar_url || user?.avatar;
  const initials = (user?.profile?.full_name || user?.name || 'U').charAt(0).toUpperCase();
  const [createOpen, setCreateOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: createOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [createOpen, progress]);

  const chooseCreateAction = (item: (typeof CREATE_ITEMS)[number]) => {
    setCreateOpen(false);
    router.navigate((item.route + '?create=' + item.create) as Href);
  };

  const renderItem = (item: (typeof ITEMS)[number]) => {
    const active = activeName === item.routeName;
    return (
      <Pressable
        key={item.routeName}
        onPress={() => router.navigate(item.href)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.label}
        className="min-w-0 flex-1 items-center justify-center gap-1"
      >
        <View className={active ? 'h-11 w-11 items-center justify-center rounded-md bg-white/10' : 'h-11 w-11 items-center justify-center rounded-md'}>
          <Image source={item.icon} className="h-6 w-6" resizeMode="contain" />
        </View>
        <Text className="text-center text-[9px] font-bold" style={{ color: active ? '#F4F7E9' : '#A6B1A6' }} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{ paddingBottom: insets.bottom, backgroundColor: '#17231D' }}
      className="relative flex-row items-center border-t border-white/10 px-1 pt-1"
    >
      {ITEMS.slice(0, 2).map(renderItem)}
      <Pressable
        onPress={() => setCreateOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel="Tạo mới"
        accessibilityState={{ expanded: createOpen }}
        className="min-w-0 flex-1 items-center justify-center"
      >
        <Animated.View
          style={{
            transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
            backgroundColor: '#D3EB5E',
          }}
          className="h-[52px] w-[52px] items-center justify-center rounded-full border border-white/40 shadow-lg"
        >
          <Plus size={27} color="#17231D" />
        </Animated.View>
      </Pressable>
      {renderItem(ITEMS[2])}
      <Pressable
        onPress={() => router.navigate('/(tabs)/profile')}
        accessibilityRole="tab"
        accessibilityLabel="Hồ sơ"
        accessibilityState={{ selected: activeName === 'profile' }}
        className="min-w-0 flex-1 items-center justify-center gap-1"
      >
        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#D3EB5E]/50 bg-[#D3EB5E]">
          {avatarUrl ? <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" /> : <UserRound size={23} color="#263829" />}
        </View>
        <Text className="text-center text-[9px] font-bold" style={{ color: activeName === 'profile' ? '#F4F7E9' : '#A6B1A6' }}>Hồ sơ</Text>
      </Pressable>

      <Modal transparent visible={createOpen} animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(8, 16, 10, .16)' }}>
          <Pressable onPress={() => setCreateOpen(false)} accessibilityLabel="Đóng menu tạo mới" className="absolute inset-0" />
          <View pointerEvents="box-none" style={{ position: 'absolute', left: '50%', bottom: insets.bottom + 42, width: 1, height: 1 }}>
            {CREATE_ITEMS.map((item) => {
              const Icon = item.icon;
              const animatedStyle = {
                opacity: progress,
                transform: [
                  { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, item.x] }) },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, item.y] }) },
                  { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) },
                ],
              };
              return (
                <Animated.View key={item.create} style={[{ position: 'absolute', left: -43, top: -39, width: 86, alignItems: 'center' }, animatedStyle]}>
                  <Pressable onPress={() => chooseCreateAction(item)} accessibilityRole="button" accessibilityLabel={'Tạo ' + item.label} className="items-center gap-1">
                    <View className="h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-[#D3EB5E] shadow-lg">
                      <Icon size={21} color="#17231D" />
                    </View>
                    <Text className="rounded bg-[#202D23] px-1.5 py-0.5 text-[10px] font-bold text-[#F4F7E9]">{item.label}</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}
