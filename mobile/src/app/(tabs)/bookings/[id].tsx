import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { Button } from '@/components/ui/button';
import { BookingBar } from '@/components/courts/booking-bar';
import { DateStrip } from '@/components/courts/date-strip';
import { FACILITY_ICONS } from '@/components/courts/venue-card';
import { SlotGrid } from '@/components/courts/slot-grid';
import { useVenueQuery } from '@/hooks/queries/use-courts';
import { useAvailabilityQuery, useCreateBookingBatchMutation } from '@/hooks/queries/use-bookings';
import { buildOccupiedSlotSet, getVietnamDate, slotStart } from '@/lib/slots';
import { SPORTS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const venueId = Number(id);
  const user = useAuthStore((s) => s.user);

  const { data: venue, isLoading, isError } = useVenueQuery(venueId);
  const [selectedDate, setSelectedDate] = useState(() => getVietnamDate());
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  const {
    data: availability,
    isLoading: isAvailabilityLoading,
    isError: isAvailabilityError,
    refetch: refetchAvailability,
  } = useAvailabilityQuery(venueId, selectedDate);

  const createBookingBatch = useCreateBookingBatchMutation(venueId, selectedDate);

  const occupiedSlots = useMemo(
    () => buildOccupiedSlotSet(availability ?? [], selectedDate),
    [availability, selectedDate],
  );

  const courts = useMemo(() => venue?.courts ?? [], [venue?.courts]);
  const isOwnedByUser = !!venue && venue.owner_id === user?.id;

  const selectedItems = useMemo(
    () =>
      Array.from(selectedSlots)
        .map((key) => {
          const [courtIdRaw, time] = key.split('|');
          const court = courts.find((c) => c.id === Number(courtIdRaw));
          return court ? { court, time } : null;
        })
        .filter((item): item is { court: (typeof courts)[number]; time: string } => item !== null),
    [selectedSlots, courts],
  );
  const totalPrice = selectedItems.reduce((sum, { court }) => sum + court.price_per_hour / 2, 0);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedSlots(new Set());
  };

  const handleToggleSlot = (key: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirmBooking = async () => {
    if (!selectedItems.length) return;
    try {
      const bookings = selectedItems.map(({ court, time }) => {
        const start = slotStart(selectedDate, time);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        return { court_id: court.id, start_time: start.toISOString(), end_time: end.toISOString() };
      });
      const created = await createBookingBatch.mutateAsync(bookings);
      setSelectedSlots(new Set());
      Alert.alert(
        'Đặt sân thành công!',
        `Đã đặt ${created.length} khung giờ, tổng ${created.reduce((sum, b) => sum + b.total_price, 0).toLocaleString('vi-VN')}đ.`,
      );
    } catch (error) {
      Alert.alert('Không thể đặt sân', error instanceof Error ? error.message : 'Vui lòng thử lại');
      refetchAvailability();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
        <LoadingState label="Đang tải thông tin sân…" />
      </SafeAreaView>
    );
  }

  if (isError || !venue) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg px-4 dark:bg-bg-dark">
        <EmptyState title="Không tìm thấy sân" description="Sân này có thể đã bị gỡ hoặc không còn hoạt động." />
        <Button variant="outline" label="Quay lại" onPress={() => router.back()} className="mt-4" />
      </SafeAreaView>
    );
  }

  const sportMeta = SPORTS.find((s) => s.key === venue.sport_key);
  const facilities = Object.entries(venue.facilities || {}).filter(([, enabled]) => enabled);

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        <View className="h-52 w-full bg-slate-200 dark:bg-slate-800">
          {venue.image_url ? (
            <Image source={{ uri: resolveMediaUrl(venue.image_url) }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full items-center justify-center">
              <Text className="text-6xl">{sportMeta?.emoji ?? '🏟️'}</Text>
            </View>
          )}
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="absolute left-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-black/50"
          >
            <ArrowLeft size={18} color="#fff" />
          </Pressable>
        </View>

        <View className="gap-3 px-4 pt-4">
          <Text className="text-2xl font-black text-slate-900 dark:text-white">{venue.name}</Text>
          <View className="flex-row items-start gap-1.5">
            <MapPin size={15} color="#F43F5E" />
            <Text className="flex-1 text-sm text-slate-600 dark:text-slate-300">{venue.address}</Text>
          </View>
          {venue.description ? (
            <Text className="text-sm text-slate-500 dark:text-slate-400">{venue.description}</Text>
          ) : null}

          {facilities.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {facilities.map(([key]) => {
                const facility = FACILITY_ICONS[key];
                if (!facility) return null;
                const Icon = facility.icon;
                return (
                  <View key={key} className="flex-row items-center gap-1.5 rounded-xl bg-emerald-500/10 px-2.5 py-1.5">
                    <Icon size={13} color="#059669" />
                    <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{facility.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {isOwnedByUser ? (
            <View className="mt-2 flex-row gap-2.5">
              <Button
                variant="outline"
                label="Chỉnh sửa sân"
                className="flex-1"
                onPress={() =>
                  router.push({ pathname: '/bookings/owner/[venueId]/edit', params: { venueId: String(venue.id) } })
                }
              />
              <Button
                label="Quản lý lịch"
                className="flex-1"
                onPress={() =>
                  router.push({ pathname: '/bookings/owner/[venueId]/schedule', params: { venueId: String(venue.id) } })
                }
              />
            </View>
          ) : courts.length === 0 ? (
            <View className="mt-2 rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10">
              <Text className="text-sm text-amber-900 dark:text-amber-300">
                Sân này chưa có sân con đang hoạt động nên hiện chưa thể đặt trực tuyến.
              </Text>
            </View>
          ) : (
            <View className="mt-2 gap-3">
              <Text className="text-base font-black text-slate-900 dark:text-white">
                Chọn khung giờ (mỗi ô 30 phút)
              </Text>
              <DateStrip selectedDate={selectedDate} onSelectDate={handleSelectDate} />
              <SlotGrid
                courts={courts}
                selectedDate={selectedDate}
                occupiedSlots={occupiedSlots}
                selectedSlots={selectedSlots}
                onToggleSlot={handleToggleSlot}
                isLoading={isAvailabilityLoading}
                error={isAvailabilityError ? 'Không tải được lịch đặt sân.' : undefined}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {!isOwnedByUser && courts.length > 0 ? (
        <BookingBar
          selectedCount={selectedSlots.size}
          totalPrice={totalPrice}
          onConfirm={handleConfirmBooking}
          isSubmitting={createBookingBatch.isPending}
          disabled={isAvailabilityLoading || isAvailabilityError}
        />
      ) : null}
    </SafeAreaView>
  );
}
