import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { Crown } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { SPORTS, SPORT_KEY_BY_NAME } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';

const LEVEL_LABELS: Record<string, string> = {
  Beginner: 'Mới chơi',
  Intermediate: 'Trung bình',
  Advanced: 'Khá',
  Expert: 'Chuyên nghiệp',
  'Chưa biết': 'Chưa biết',
};

/** Left column of the web community feed: "Môn của bạn" (sports with levels) and the Premium promo card. */
export function FeedProfilePanel() {
  const userSports = useAuthStore((s) => s.user?.sports);

  // One entry per sport name, like the web sidebar.
  const sports = [
    ...new Map(
      (userSports ?? [])
        .map((item) => {
          const rawName = item.sport?.name?.trim() ?? '';
          const meta = SPORTS.find((s) => s.key === SPORT_KEY_BY_NAME[rawName.toLowerCase()]);
          const name = meta?.name ?? rawName;
          return [
            name,
            { name, emoji: meta?.emoji ?? '🏅', level: LEVEL_LABELS[item.skill_level] ?? (item.skill_level || 'Chưa biết') },
          ] as const;
        })
        .filter(([name]) => name),
    ).values(),
  ];

  return (
    <View className="gap-3">
      <View className="gap-2">
        <Text className="text-[11px] font-extrabold tracking-widest text-slate-500 dark:text-slate-400">MÔN CỦA BẠN</Text>
        {sports.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
            {sports.map((sport) => (
              <Pressable
                key={sport.name}
                onPress={() => router.navigate('/(tabs)/profile')}
                className="flex-row items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2 dark:border-border-dark dark:bg-[#111827]"
              >
                <Text className="text-sm">{sport.emoji}</Text>
                <Text className="text-xs font-bold text-slate-800 dark:text-slate-100">{sport.name}</Text>
                <Text className="text-[11px] text-slate-500 dark:text-slate-400">· {sport.level}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable onPress={() => router.navigate('/(tabs)/profile')} hitSlop={6}>
            <Text className="text-sm font-bold text-brand dark:text-brand-dark">+ Thêm môn yêu thích</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => router.navigate('/(tabs)/premium')}
        className="gap-1 rounded-2xl border border-[#a094f6]/30 bg-[#1b2240] p-4"
      >
        <View className="flex-row items-center gap-2">
          <Crown size={18} color="#e7dcff" />
          <Text className="text-sm font-black text-white">Chơi theo cách của bạn</Text>
        </View>
        <Text className="text-xs leading-5 text-[#b1bdd4]">
          Khám phá những lợi ích giúp bạn kết nối với cộng đồng dễ hơn.
        </Text>
        <Text className="mt-1 text-xs font-bold text-[#b8b1ff]">Khám phá Premium →</Text>
      </Pressable>
    </View>
  );
}
