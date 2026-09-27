import { router } from 'expo-router';
import { ArrowLeft, MapPin, Search, Swords, Trophy, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { Input } from '@/components/ui/input';
import { useSearchQuery } from '@/hooks/queries/use-search';
import type { SearchResult } from '@/schemas/common';

const KIND_META: Record<SearchResult['kind'], { icon: typeof MapPin; label: string }> = {
  venue: { icon: MapPin, label: 'Sân' },
  gameroom: { icon: Swords, label: 'Trận đấu' },
  team: { icon: Users, label: 'CLB' },
  lfg: { icon: Trophy, label: 'Tìm nhóm' },
};

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useSearchQuery(debouncedQuery);

  const handlePress = (item: SearchResult) => {
    if (item.kind === 'venue') {
      router.push({ pathname: '/bookings/[id]', params: { id: String(item.id) } });
    } else {
      Alert.alert('Sắp ra mắt', 'Mục này sẽ khả dụng ở giai đoạn tiếp theo.');
    }
  };

  return (
    <ScreenContainer scroll={false} className="gap-3 pt-3">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={22} color="#94A3B8" />
        </Pressable>
        <Input
          autoFocus
          placeholder="Tìm sân, đối thủ, CLB..."
          value={query}
          onChangeText={setQuery}
          containerClassName="flex-1"
        />
      </View>

      {debouncedQuery.trim().length < 2 ? (
        <EmptyState icon={Search} title="Nhập ít nhất 2 ký tự để tìm kiếm" />
      ) : isLoading ? (
        <LoadingState label="Đang tìm…" />
      ) : (
        <FlatList
          className="flex-1"
          data={results ?? []}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerClassName="gap-2 pb-8"
          renderItem={({ item }) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <TouchableOpacity
                onPress={() => handlePress(item)}
                className="flex-row items-center gap-3 rounded-2xl border border-border p-3.5 dark:border-border-dark"
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand-dark/10">
                  <Icon size={18} color="#0EA5E9" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                    {meta.label} · {item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<EmptyState icon={Search} title="Không tìm thấy kết quả phù hợp" />}
        />
      )}
    </ScreenContainer>
  );
}
