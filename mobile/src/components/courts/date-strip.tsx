import { ScrollView, Text, TouchableOpacity } from 'react-native';

import { cn } from '@/lib/utils';
import { buildDateStrip } from '@/lib/slots';

interface DateStripProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  days?: number;
}

export function DateStrip({ selectedDate, onSelectDate, days = 7 }: DateStripProps) {
  const dates = buildDateStrip(days);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 pb-1">
      {dates.map((date) => {
        const selected = date.value === selectedDate;
        return (
          <TouchableOpacity
            key={date.value}
            onPress={() => onSelectDate(date.value)}
            className={cn(
              'min-w-[72px] items-center rounded-2xl border px-4 py-2.5',
              selected
                ? 'border-transparent bg-brand dark:bg-brand-dark'
                : 'border-border bg-slate-50 dark:border-border-dark dark:bg-white/5',
            )}
          >
            <Text
              className={cn(
                'text-[11px] font-bold uppercase',
                selected ? 'text-white' : 'text-slate-500 dark:text-slate-400',
              )}
            >
              {date.label}
            </Text>
            <Text className={cn('my-0.5 text-lg font-black', selected ? 'text-white' : 'text-slate-800 dark:text-white')}>
              {date.day}
            </Text>
            <Text className={cn('text-[10px] font-bold', selected ? 'text-white/80' : 'text-slate-400')}>
              Th{date.month}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
