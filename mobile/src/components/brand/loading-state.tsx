import { RefreshCw } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useResolvedColorScheme } from '@/stores/theme-store';
import { colors } from '@/theme/colors';

export function LoadingState({ label = 'Đang tải…' }: { label?: string }) {
  const scheme = useResolvedColorScheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="items-center justify-center gap-3 py-12">
      <Animated.View style={spinStyle}>
        <RefreshCw size={28} color={colors[scheme].brand} />
      </Animated.View>
      <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}
