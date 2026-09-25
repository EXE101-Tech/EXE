import { Check } from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { LoadingState } from '@/components/brand/loading-state';
import type { CourtResponse } from '@/schemas/courts';
import { cn } from '@/lib/utils';
import { TIME_SLOTS, getVietnamDate, nowVietnamMinutes } from '@/lib/slots';

interface SlotGridProps {
  courts: CourtResponse[];
  selectedDate: string;
  occupiedSlots: Set<string>;
  selectedSlots: Set<string>;
  onToggleSlot: (key: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function SlotGrid({
  courts,
  selectedDate,
  occupiedSlots,
  selectedSlots,
  onToggleSlot,
  isLoading,
  error,
}: SlotGridProps) {
  const today = getVietnamDate();
  const nowMinutes = nowVietnamMinutes();

  if (isLoading) return <LoadingState label="Đang tải lịch đặt…" />;
  if (error) {
    return (
      <View className="rounded-xl bg-rose-50 p-4 dark:bg-rose-500/10">
        <Text className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View className="flex-row border-b border-border pb-2 dark:border-border-dark">
          <View className="w-24 shrink-0" />
          {TIME_SLOTS.map((time) => (
            <View key={time} className="w-14 shrink-0 items-center">
              <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{time}</Text>
            </View>
          ))}
        </View>

        {courts.map((court) => (
          <View key={court.id} className="flex-row items-center border-b border-border py-1.5 dark:border-border-dark">
            <View className="w-24 shrink-0 pr-2">
              <Text className="text-xs font-bold text-slate-800 dark:text-white" numberOfLines={2}>
                {court.name}
              </Text>
            </View>
            {TIME_SLOTS.map((time) => {
              const key = `${court.id}|${time}`;
              const selected = selectedSlots.has(key);
              const occupied = occupiedSlots.has(key);
              const [hour, minute] = time.split(':').map(Number);
              const past = selectedDate === today && hour * 60 + minute <= nowMinutes;
              const disabled = past || occupied;
              return (
                <View key={time} className="w-14 shrink-0 items-center p-0.5">
                  <TouchableOpacity
                    disabled={disabled}
                    onPress={() => onToggleSlot(key)}
                    className={cn(
                      'h-11 w-full items-center justify-center rounded-lg',
                      disabled
                        ? 'bg-slate-200/80 dark:bg-slate-800/60'
                        : selected
                          ? 'bg-emerald-600'
                          : 'bg-slate-50 dark:bg-white/5',
                    )}
                  >
                    {selected ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
