import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, MapPin, Share2, ShieldCheck, Sparkles, Star } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
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
import { cn } from '@/lib/utils';
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
  const minSlotPrice = courts.length > 0 ? Math.min(...courts.map((c) => c.price_per_hour / 2)) : null;

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

  const handleShare = (venueName: string, address: string) => {
    Share.share({ message: `${venueName} — ${address}` }).catch(() => {});
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
        <Button variant="outline" label="Quay lại" onPress={() => router.replace('/bookings')} className="mt-4" />
      </SafeAreaView>
    );
  }

  const sportMeta = SPORTS.find((s) => s.key === venue.sport_key);
  const ratingLabel = venue.rating != null ? venue.rating.toFixed(1) : 'Chưa đánh giá';

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
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 88 }}
          />

          <View className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => router.replace('/bookings')}
              hitSlop={8}
              className="flex-row items-center gap-1.5 rounded-full bg-black/50 px-3 py-2"
            >
              <ArrowLeft size={16} color="#fff" />
              <Text className="text-xs font-bold text-white">Quay lại danh sách</Text>
            </Pressable>
            <Pressable
              onPress={() => handleShare(venue.name, venue.address)}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-black/50"
            >
              <Share2 size={16} color="#fff" />
            </Pressable>
          </View>

          <Text className="absolute bottom-3 left-4 right-4 text-xl font-black text-white" numberOfLines={2}>
            {venue.name}
          </Text>
        </View>

        <View className="gap-3 px-4 pt-4">
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="flex-row items-center gap-1 rounded-full bg-black/80 px-2.5 py-1.5 dark:bg-white/10">
              <Text className="text-xs font-bold text-white" numberOfLines={1}>
                {sportMeta?.emoji ?? '🏅'} {sportMeta?.name ?? 'Môn thể thao'}
              </Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5">
              <Star size={12} color="#F59E0B" fill={venue.rating != null ? '#F59E0B' : 'none'} />
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">{ratingLabel}</Text>
              <Text className="text-xs font-semibold text-amber-600/70 dark:text-amber-400/70">
                ({venue.review_count} đánh giá)
              </Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1.5">
              <ShieldCheck size={13} color="#059669" />
              <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {venue.court_count} sân đang hoạt động
              </Text>
            </View>
          </View>

          <View className="flex-row items-start gap-1.5">
            <MapPin size={15} color="#F43F5E" />
            <Text className="flex-1 text-sm text-slate-600 dark:text-slate-300">{venue.address}</Text>
          </View>

          {venue.price_label ? (
            <View className="flex-row items-center justify-between border-y border-border py-3 dark:border-border-dark">
              <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Giá thuê khung 30 phút</Text>
              <Text className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {venue.price_label} <Text className="text-xs font-semibold text-slate-400">/ 30p</Text>
              </Text>
            </View>
          ) : null}

          {venue.description ? (
            <Text className="text-sm text-slate-500 dark:text-slate-400">{venue.description}</Text>
          ) : null}

          <View>
            <View className="mb-2 flex-row items-center gap-1.5">
              <Sparkles size={14} color="#F59E0B" />
              <Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Dịch vụ & tiện ích đi kèm
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {Object.entries(FACILITY_ICONS).map(([key, facility]) => {
                const Icon = facility.icon;
                const active = !!venue.facilities?.[key];
                return (
                  <View
                    key={key}
                    className={cn(
                      'basis-[48%] items-center gap-1.5 rounded-2xl border-2 px-3 py-3',
                      active
                        ? 'border-brand bg-brand/10 dark:border-brand-dark dark:bg-brand-dark/10'
                        : 'border-border bg-slate-50 opacity-50 dark:border-border-dark dark:bg-white/5',
                    )}
                  >
                    <Icon size={18} color={active ? '#059669' : '#94A3B8'} />
                    <Text
                      className={cn(
                        'text-center text-xs font-bold',
                        active ? 'text-brand dark:text-brand-dark' : 'text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {facility.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

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
              <View className="flex-row items-center gap-1.5">
                <Clock size={15} color="#059669" />
                <Text className="text-base font-black text-slate-900 dark:text-white">
                  Chọn khung giờ (mỗi ô 30 phút)
                </Text>
              </View>
              {minSlotPrice != null ? (
                <Text className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Giá tham khảo thấp nhất: {minSlotPrice.toLocaleString('vi-VN')}đ / 30 phút. Giá từng sân được tính
                  khi xác nhận.
                </Text>
              ) : null}

              <View className="flex-row flex-wrap items-center gap-3">
                <View className="flex-row items-center gap-1.5">
                  <View className="h-3 w-3 rounded border border-border bg-slate-100 dark:border-border-dark dark:bg-white/10" />
                  <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Còn trống</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="h-3 w-3 rounded bg-slate-300 dark:bg-slate-700" />
                  <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Đã qua / Đã đặt
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="h-3 w-3 rounded bg-emerald-600" />
                  <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Đang chọn ({selectedSlots.size})
                  </Text>
                </View>
              </View>

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
          scheduleLoading={isAvailabilityLoading}
          disabled={isAvailabilityLoading || isAvailabilityError}
        />
      ) : null}
    </SafeAreaView>
  );
}
