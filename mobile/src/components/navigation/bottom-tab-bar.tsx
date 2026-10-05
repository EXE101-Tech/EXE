import { Text } from '@/components/ui/text';
import { router, usePathname, type Href } from 'expo-router';
import { Gamepad2, House, MessageCircle, User, Users, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from '@/components/ui/avatar';
import { useChatUnreadCount } from '@/hooks/queries/use-chat';
import { useAuthStore } from '@/stores/auth-store';
import { useResolvedColorScheme } from '@/stores/theme-store';
import { colors } from '@/theme/colors';

interface BarItem {
  /** First URL segment (`usePathname()`) this button represents, used for active-tab highlighting. */
  routeName: string;
  href: Href;
  label: string;
  icon: LucideIcon;
}

const LEFT_ITEMS: BarItem[] = [
  { routeName: 'forum', href: '/(tabs)/forum', label: 'Cộng đồng', icon: House },
  { routeName: 'chat', href: '/(tabs)/chat', label: 'Chat', icon: MessageCircle },
];

/** The raised middle button. */
const CENTER_ITEM: BarItem = { routeName: 'teams', href: '/(tabs)/teams', label: 'Team', icon: Users };

const RIGHT_ITEMS: BarItem[] = [
  { routeName: 'gamerooms', href: '/(tabs)/gamerooms', label: 'Tìm trận', icon: Gamepad2 },
  { routeName: 'profile', href: '/(tabs)/profile', label: 'Hồ sơ', icon: User },
];

const BAR_HEIGHT = 62;
const CIRCLE_SIZE = 58;
/** How far the raised circle pokes out above the bar. */
const OVERHANG = 22;
/** Radius of the round cut-out in the bar around the circle (circle radius + a small gap). */
const NOTCH_RADIUS = CIRCLE_SIZE / 2 + 8;
/** Rounding where the flat top edge meets the cut-out. */
const SHOULDER = 9;
/** Vertical position of the cut-out arc centre, measured from the top edge of the bar. */
const NOTCH_CENTER_Y = 8;

/** Bar silhouette with a circular notch in the middle: [filled shape, top outline only]. */
function barPaths(width: number): [string, string] {
  const cx = width / 2;
  const top =
    `M0 0 H${cx - NOTCH_RADIUS - SHOULDER} ` +
    `Q${cx - NOTCH_RADIUS} 0 ${cx - NOTCH_RADIUS} ${SHOULDER} ` +
    `A${NOTCH_RADIUS} ${NOTCH_RADIUS} 0 0 0 ${cx + NOTCH_RADIUS} ${SHOULDER} ` +
    `Q${cx + NOTCH_RADIUS} 0 ${cx + NOTCH_RADIUS + SHOULDER} 0 H${width}`;
  return [`${top} V${BAR_HEIGHT} H0 Z`, top];
}

export function BottomTabBar() {
  const scheme = useResolvedColorScheme();
  const theme = colors[scheme];
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const unreadChats = useChatUnreadCount();
  const user = useAuthStore((s) => s.user);
  const [width, setWidth] = useState(0);

  const panel = scheme === 'dark' ? '#111827' : '#ffffff';
  // First path segment, e.g. "/gamerooms" -> "gamerooms", "/forum" -> "forum".
  const activeName = pathname.split('/').filter(Boolean)[0];
  const goTo = (item: BarItem) => router.navigate(item.href);

  const renderItem = (item: BarItem) => {
    const active = activeName === item.routeName;
    const Icon = item.icon;
    // Once signed in, the "Hồ sơ" tab shows the member's own avatar instead of a generic icon.
    const showAvatar = item.routeName === 'profile' && user != null;
    return (
      <TouchableOpacity
        key={item.routeName}
        onPress={() => goTo(item)}
        className="flex-1 items-center justify-center gap-0.5"
        accessibilityLabel={item.label}
      >
        <View>
          {showAvatar ? (
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 2,
                borderColor: active ? theme.brand : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar uri={user.profile?.avatar_url} fallback={user.name} size={20} />
            </View>
          ) : (
            <Icon size={22} color={active ? theme.brand : '#94A3B8'} strokeWidth={active ? 2.4 : 2} />
          )}
          {item.routeName === 'chat' && unreadChats > 0 ? (
            <View className="absolute -right-2.5 -top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1">
              <Text className="text-[9px] font-black text-white">{unreadChats > 9 ? '9+' : unreadChats}</Text>
            </View>
          ) : null}
        </View>
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

  const centerActive = activeName === CENTER_ITEM.routeName;
  const CenterIcon = CENTER_ITEM.icon;
  const [fillPath, outlinePath] = width ? barPaths(width) : ['', ''];

  return (
    <View style={{ backgroundColor: theme.bg }}>
      <View style={{ height: BAR_HEIGHT + OVERHANG }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR_HEIGHT }}>
          {width ? (
            <Svg width={width} height={BAR_HEIGHT} style={{ position: 'absolute' }}>
              <Path d={fillPath} fill={panel} />
              <Path d={outlinePath} stroke={theme.border} strokeWidth={1} fill="none" />
            </Svg>
          ) : null}

          <View className="flex-1 flex-row items-center pt-1">
            {LEFT_ITEMS.map(renderItem)}
            {/* Middle column: the circle is drawn above; only its label lives inside the bar. */}
            <Pressable
              onPress={() => goTo(CENTER_ITEM)}
              className="flex-1 items-center justify-end self-stretch pb-1.5"
              accessibilityLabel={CENTER_ITEM.label}
            >
              <Text
                className="text-[10px] font-bold"
                style={{ color: centerActive ? theme.brand : '#94A3B8' }}
                numberOfLines={1}
              >
                {CENTER_ITEM.label}
              </Text>
            </Pressable>
            {RIGHT_ITEMS.map(renderItem)}
          </View>
        </View>

        {width ? (
          <TouchableOpacity
            onPress={() => goTo(CENTER_ITEM)}
            activeOpacity={0.85}
            accessibilityLabel={CENTER_ITEM.label}
            style={{
              position: 'absolute',
              left: width / 2 - CIRCLE_SIZE / 2,
              // Circle centre sits on the notch arc centre (NOTCH_CENTER_Y below the bar top).
              top: OVERHANG + NOTCH_CENTER_Y - CIRCLE_SIZE / 2,
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              borderRadius: CIRCLE_SIZE / 2,
              backgroundColor: theme.brand,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: theme.brand,
              shadowOpacity: centerActive ? 0.55 : 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            <CenterIcon size={26} color="#fff" strokeWidth={centerActive ? 2.6 : 2.2} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ height: insets.bottom, backgroundColor: panel }} />
    </View>
  );
}
