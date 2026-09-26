import { Check, Layers } from 'lucide-react-native';
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
    <View className="overflow-hidden rounded-2xl border border-border bg-white dark:border-border-dark dark:bg-[#0F1E36]">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row items-center bg-slate-50 dark:bg-white/5">
            <View className="w-24 shrink-0 flex-row items-center gap-1.5 px-2 py-2.5">
              <Layers size={13} color="#059669" />
              <Text className="text-[11px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400">
                Sân
              </Text>
            </View>
            {TIME_SLOTS.map((time) => (
              <View key={time} className="w-14 shrink-0 items-center py-2.5">
                <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{time}</Text>
              </View>
            ))}
          </View>

          {courts.map((court, index) => (
            <View
              key={court.id}
              className={cn(
                'flex-row items-center py-1.5',
                index > 0 && 'border-t border-border dark:border-border-dark',
              )}
            >
              <View className="w-24 shrink-0 px-2">
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
                          ? 'bg-slate-300 dark:bg-slate-700'
                          : selected
                            ? 'bg-emerald-600'
                            : 'border border-border bg-slate-100 dark:border-border-dark dark:bg-white/10',
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
    </View>
  );
}
