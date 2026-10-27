import { Text } from '@/components/ui/text';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DateTimeFieldProps {
  mode: 'date' | 'time';
  /** `YYYY-MM-DD` for dates, `HH:mm` for times — the same strings the forms already validate and submit. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The string value is a plain wall-clock reading, so it is turned into a Date from its parts (no time-zone shift). */
function toDate(mode: 'date' | 'time', value: string): Date {
  const now = new Date();
  if (mode === 'date') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : now;
  }
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(match[1]), Number(match[2])) : now;
}

function fromDate(mode: 'date' | 'time', date: Date): string {
  return mode === 'date'
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Shown to the user: dates as dd/MM/yyyy (what the web date input displays in Vietnamese), times as HH:mm. */
function display(mode: 'date' | 'time', value: string): string {
  if (mode === 'time') return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/**
 * Native date / time chooser (web: `<input type="date">` and `<input type="time">`). Android opens the system
 * dialog, iOS shows the wheel/calendar in a sheet with a confirm button. On web it falls back to a text field.
 */
export function DateTimeField({ mode, value, onChange, error, className }: DateTimeFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => toDate(mode, value));

  if (Platform.OS === 'web') {
    return (
      <Input
        value={value}
        onChangeText={onChange}
        placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:mm'}
        error={error}
        containerClassName={className}
      />
    );
  }

  const open = () => {
    const current = toDate(mode, value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: true,
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === 'set' && selected) onChange(fromDate(mode, selected));
        },
      });
      return;
    }
    setDraft(current);
    setIosOpen(true);
  };

  return (
    <View className={className}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={mode === 'date' ? 'Chọn ngày' : 'Chọn giờ'}
        className={cn(
          'h-12 justify-center rounded-xl border border-border bg-white px-4 dark:border-border-dark dark:bg-[#0d1424]',
          error && 'border-rose-500',
        )}
      >
        <Text className="text-base text-slate-900 dark:text-white">{display(mode, value)}</Text>
      </Pressable>
      {error ? <Text className="mt-1 text-xs font-semibold text-rose-500">{error}</Text> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setIosOpen(false)}>
            <Pressable className="gap-2 rounded-t-3xl bg-white p-4 dark:bg-[#101827]" onPress={() => {}}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                is24Hour
                locale="vi-VN"
                onChange={(_event, selected) => {
                  if (selected) setDraft(selected);
                }}
              />
              <View className="flex-row justify-end gap-2.5">
                <Button variant="outline" label="Hủy" onPress={() => setIosOpen(false)} />
                <Button
                  label="Xong"
                  onPress={() => {
                    onChange(fromDate(mode, draft));
                    setIosOpen(false);
                  }}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
