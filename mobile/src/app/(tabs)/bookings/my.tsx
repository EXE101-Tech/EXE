import { router } from 'expo-router';
import { ArrowLeft, CalendarDays } from 'lucide-react-native';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { BookingCard } from '@/components/bookings/booking-card';
import { useBookingsQuery, useCancelBookingMutation } from '@/hooks/queries/use-bookings';

export default function MyBookingsScreen() {
  const { data: bookings, isLoading, isError, refetch, isRefetching } = useBookingsQuery();
  const cancelBooking = useCancelBookingMutation();

  const ordered = [...(bookings ?? [])].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  const handleCancel = (id: number) => {
    Alert.alert('Hủy lịch đặt', 'Bạn có chắc muốn hủy lịch đặt sân này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy lịch',
        style: 'destructive',
        onPress: () => cancelBooking.mutate(id, { onError: (e) => Alert.alert('Lỗi', e.message) }),
      },
    ]);
  };

  return (
    <ScreenContainer scroll={false} className="pt-3">
      <View className="mb-4 flex-row items-center gap-3">
        <Pressable onPress={() => router.replace('/bookings')} hitSlop={8}>
          <ArrowLeft size={22} color="#94A3B8" />
        </Pressable>
        <Text className="text-2xl font-black text-slate-900 dark:text-white">Lịch đặt của tôi</Text>
      </View>

      {isLoading ? (
        <LoadingState label="Đang tải lịch đặt…" />
      ) : isError ? (
        <EmptyState icon={CalendarDays} title="Không tải được lịch đặt" description="Kéo để tải lại." />
      ) : (
        <FlatList
          className="flex-1"
          data={ordered}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-3 pb-8"
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onCancel={() => handleCancel(item.id)}
              isCancelling={cancelBooking.isPending && cancelBooking.variables === item.id}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={CalendarDays}
              title="Bạn chưa có lịch đặt sân"
              description="Khi đặt sân, các lịch đã xác nhận sẽ xuất hiện ở đây."
            />
          }
        />
      )}
    </ScreenContainer>
  );
}
