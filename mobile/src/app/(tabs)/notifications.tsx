import { router } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '@/hooks/queries/use-notifications';
import { formatDateVi, formatTimeVi } from '@/lib/slots';
import type { NotificationResponse } from '@/schemas/notifications';
import { cn } from '@/lib/utils';

export default function NotificationsScreen() {
  const { data, isLoading } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const handlePress = (item: NotificationResponse) => {
    if (!item.is_read) markRead.mutate(item.id);
  };

  return (
    <ScreenContainer scroll={false} className="gap-3 pt-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={22} color="#94A3B8" />
          </Pressable>
          <Text className="text-xl font-black text-slate-900 dark:text-white">Thông báo</Text>
        </View>
        {(data?.unread_count ?? 0) > 0 ? (
          <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
            <Text className="text-xs font-bold text-brand dark:text-brand-dark">Đánh dấu đã đọc tất cả</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <LoadingState label="Đang tải thông báo…" />
      ) : (
        <FlatList
          className="flex-1"
          data={data?.items ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-2 pb-8"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              className={cn(
                'gap-1 rounded-2xl border border-border p-3.5 dark:border-border-dark',
                !item.is_read && 'bg-brand/5 dark:bg-brand-dark/10',
              )}
            >
              <View className="flex-row items-center gap-2">
                {!item.is_read ? <View className="h-2 w-2 rounded-full bg-brand dark:bg-brand-dark" /> : null}
                <Text className="flex-1 font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
              <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={2}>
                {item.body}
              </Text>
              <Text className="text-[11px] text-slate-400">
                {formatDateVi(item.created_at)} · {formatTimeVi(item.created_at)}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState icon={Bell} title="Bạn chưa có thông báo nào" />}
        />
      )}
    </ScreenContainer>
  );
}
