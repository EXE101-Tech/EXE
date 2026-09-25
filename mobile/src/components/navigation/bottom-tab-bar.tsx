import { router, usePathname, type Href } from 'expo-router';
import {
  Calendar,
  Crown,
  Gamepad2,
  MessageCircle,
  MessageSquare,
  Plus,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResolvedColorScheme } from '@/stores/theme-store';
import { colors } from '@/theme/colors';

interface BarItem {
  /** First URL segment (`usePathname()`) this button represents — used for active-tab highlighting. */
  routeName: string;
  href: Href;
  label: string;
  icon: LucideIcon;
}

const LEFT_ITEMS: BarItem[] = [
  { routeName: 'forum', href: '/(tabs)/forum', label: 'Diễn đàn', icon: MessageSquare },
  { routeName: 'bookings', href: '/(tabs)/bookings', label: 'Đặt sân', icon: Calendar },
];

const RIGHT_ITEMS: BarItem[] = [
  { routeName: 'gamerooms', href: '/(tabs)/gamerooms', label: 'Phòng game', icon: Gamepad2 },
  { routeName: 'profile', href: '/(tabs)/profile', label: 'Hồ sơ', icon: User },
];

// Fan spread above the FAB: left-most to right-most, in standard math degrees (90° = straight up).
const EXPAND_ITEMS: { item: BarItem; angleDeg: number }[] = [
  { item: { routeName: 'chat', href: '/(tabs)/chat', label: 'Chat', icon: MessageCircle }, angleDeg: 145 },
  { item: { routeName: 'premium', href: '/(tabs)/premium', label: 'Premium', icon: Crown }, angleDeg: 90 },
  { item: { routeName: 'teams', href: '/(tabs)/teams', label: 'Teams', icon: Users }, angleDeg: 35 },
];

const FAN_RADIUS = 80;
const ANIM_DURATION = 160;

function FanItem({
  item,
  angleDeg,
  progress,
  brandColor,
  onPress,
}: {
  item: BarItem;
  angleDeg: number;
  progress: SharedValue<number>;
  brandColor: string;
  onPress: () => void;
}) {
  const rad = (angleDeg * Math.PI) / 180;
  const targetX = FAN_RADIUS * Math.cos(rad) - 28;
  const targetY = -FAN_RADIUS * Math.sin(rad) - 28;

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * targetX },
      { translateY: progress.value * targetY },
      { scale: 0.7 + progress.value * 0.3 },
    ],
    opacity: progress.value,
  }));

  const Icon = item.icon;
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: 64, alignItems: 'center' }, style]}>
      <Pressable onPress={onPress} className="items-center gap-1.5">
        <View
          style={{ backgroundColor: brandColor }}
          className="h-14 w-14 items-center justify-center rounded-full shadow-lg"
        >
          <Icon size={22} color="#fff" />
        </View>
        <Text className="text-xs font-bold text-white">{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function BottomTabBar() {
  const scheme = useResolvedColorScheme();
  const theme = colors[scheme];
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration: ANIM_DURATION });
  }, [expanded, progress]);

  // First path segment, e.g. "/bookings/5" -> "bookings", "/forum" -> "forum".
  const activeName = pathname.split('/').filter(Boolean)[0];

  const goTo = (item: BarItem) => {
    setExpanded(false);
    router.navigate(item.href);
  };

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 45}deg` }],
  }));

  const renderItem = (item: BarItem) => {
    const active = activeName === item.routeName;
    const Icon = item.icon;
    return (
      <TouchableOpacity
        key={item.routeName}
        onPress={() => goTo(item)}
        className="flex-1 items-center justify-center gap-0.5 py-1.5"
      >
        <Icon size={22} color={active ? theme.brand : '#94A3B8'} />
        <Text
          className="text-[10px] font-bold"
          style={{ color: active ? theme.brand : '#94A3B8' }}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{ paddingBottom: insets.bottom, backgroundColor: scheme === 'dark' ? '#0F1E36' : '#FFFFFF' }}
      className="flex-row items-center border-t border-border dark:border-border-dark"
    >
      {LEFT_ITEMS.map(renderItem)}

      <View className="flex-1 items-center justify-center">
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.85}>
          <Animated.View
            style={[{ backgroundColor: theme.brand }, fabStyle]}
            className="h-14 w-14 items-center justify-center rounded-full shadow-lg"
          >
            <Plus size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {RIGHT_ITEMS.map(renderItem)}

      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <Pressable className="flex-1 bg-black/30" onPress={() => setExpanded(false)}>
          <View
            style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 28, alignItems: 'center' }}
          >
            <View style={{ width: 1, height: 1 }}>
              {EXPAND_ITEMS.map(({ item, angleDeg }) => (
                <FanItem
                  key={item.routeName}
                  item={item}
                  angleDeg={angleDeg}
                  progress={progress}
                  brandColor={theme.brand}
                  onPress={() => goTo(item)}
                />
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
