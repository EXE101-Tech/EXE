import { router } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/brand/screen-container';

/**
 * MapLibre is a native-only module (no web target) — this platform override keeps the
 * web build from trying to bundle it. Map browsing is a mobile-app-only feature.
 */
export default function MapWebFallbackScreen() {
  return (
    <ScreenContainer scroll={false} className="items-center justify-center gap-3 px-6">
      <View className="absolute left-4 top-4">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={22} color="#94A3B8" />
        </Pressable>
      </View>
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 dark:bg-brand-dark/10">
        <MapPin size={28} color="#0EA5E9" />
      </View>
      <Text className="text-xl font-black text-slate-900 dark:text-white">Bản đồ tìm sân</Text>
      <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
        Tính năng bản đồ chỉ khả dụng trên ứng dụng di động (Android/iOS). Hãy mở SportGo trên điện thoại để tìm sân
        gần bạn.
      </Text>
    </ScreenContainer>
  );
}
