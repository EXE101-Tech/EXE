import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/brand/empty-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { DateStrip } from '@/components/courts/date-strip';
import { SlotGrid } from '@/components/courts/slot-grid';
import { ScheduleBlockSheet } from '@/components/owner/schedule-block-sheet';
import { useVenueQuery } from '@/hooks/queries/use-courts';
import {
  useCreateScheduleBlockMutation,
  useOwnerScheduleQuery,
  useRemoveScheduleBlockMutation,
} from '@/hooks/queries/use-owner-venues';
import { buildOccupiedSlotSet, formatTimeVi, getVietnamDate, groupConsecutiveSlots } from '@/lib/slots';

export default function OwnerVenueScheduleScreen() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const id = Number(venueId);

  const { data: venue } = useVenueQuery(id);
  const [selectedDate, setSelectedDate] = useState(() => getVietnamDate());
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [note, setNote] = useState('');

  const { data: schedule, isLoading, isError } = useOwnerScheduleQuery(id, selectedDate);
  const createBlock = useCreateScheduleBlockMutation(id, selectedDate);
  const removeBlock = useRemoveScheduleBlockMutation(id, selectedDate);

  const courts = venue?.courts ?? [];
  const occupiedSlots = useMemo(() => buildOccupiedSlotSet(schedule ?? [], selectedDate), [schedule, selectedDate]);
  const ranges = useMemo(() => groupConsecutiveSlots(selectedDate, selectedSlots), [selectedDate, selectedSlots]);

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

  const handleConfirmBlock = async () => {
    try {
      for (const range of ranges) {
        // Sequential: each block create checks for conflicts against the ones already committed.
        await createBlock.mutateAsync({
          court_id: range.courtId,
          start_time: range.startTime,
          end_time: range.endTime,
          note: note.trim() || undefined,
        });
      }
      setSelectedSlots(new Set());
      setNote('');
      setIsSheetOpen(false);
    } catch (error) {
      Alert.alert('Không thể chặn khung giờ', error instanceof Error ? error.message : 'Vui lòng thử lại');
    }
  };

  const handleRemoveBlock = (blockId: number) => {
    Alert.alert('Gỡ khung giờ chặn', 'Người chơi sẽ có thể đặt lại khung giờ này. Tiếp tục?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gỡ',
        style: 'destructive',
        onPress: () => removeBlock.mutate(blockId, { onError: (e) => Alert.alert('Lỗi', e.message) }),
      },
    ]);
  };

  return (
    <ScreenContainer scroll={false} className="gap-3 pt-3">
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={22} color="#94A3B8" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-black text-slate-900 dark:text-white" numberOfLines={1}>
          Quản lý lịch · {venue?.name ?? '...'}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-6">
        <DateStrip selectedDate={selectedDate} onSelectDate={handleSelectDate} />

        {courts.length === 0 ? (
          <EmptyState title="Sân này chưa có sân con đang hoạt động" />
        ) : (
          <SlotGrid
            courts={courts}
            selectedDate={selectedDate}
            occupiedSlots={occupiedSlots}
            selectedSlots={selectedSlots}
            onToggleSlot={handleToggleSlot}
            isLoading={isLoading}
            error={isError ? 'Không tải được lịch của sân.' : undefined}
          />
        )}

        <View>
          <Text className="mb-2 text-base font-black text-slate-900 dark:text-white">Lịch trong ngày</Text>
          {(schedule ?? []).length === 0 ? (
            <EmptyState title="Chưa có lịch nào trong ngày này" />
          ) : (
            <View className="gap-2.5">
              {(schedule ?? [])
                .slice()
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((item) => (
                  <Card key={`${item.kind}-${item.id}`}>
                    <View className="flex-row items-center justify-between gap-2 p-3.5">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-bold text-slate-800 dark:text-white">{item.court_name}</Text>
                          <Badge
                            variant={item.kind === 'app' ? 'success' : 'warning'}
                            label={item.kind === 'app' ? 'Đặt qua app' : 'Chặn ngoài hệ thống'}
                          />
                        </View>
                        <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatTimeVi(item.start_time)}–{formatTimeVi(item.end_time)}
                          {item.note ? ` · ${item.note}` : ''}
                        </Text>
                      </View>
                      {item.kind === 'external' ? (
                        <TouchableOpacity onPress={() => handleRemoveBlock(item.id)} hitSlop={8}>
                          <Trash2 size={16} color="#DC2626" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </Card>
                ))}
            </View>
          )}
        </View>
      </ScrollView>

      {ranges.length > 0 ? (
        <Button label={`Chặn ${ranges.length} khung giờ đã chọn`} onPress={() => setIsSheetOpen(true)} />
      ) : null}

      <ScheduleBlockSheet
        visible={isSheetOpen}
        rangeCount={ranges.length}
        note={note}
        onChangeNote={setNote}
        onConfirm={handleConfirmBlock}
        onClose={() => setIsSheetOpen(false)}
        isSubmitting={createBlock.isPending}
      />
    </ScreenContainer>
  );
}
