import { Text } from '@/components/ui/text';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { formatDateVi, formatTimeVi } from '@/lib/slots';
import { cn } from '@/lib/utils';
import { showAlert } from '@/stores/dialog-store';

export const PAGE_SIZE = 10;

export function formatDateTimeVi(value?: string | null): string {
  if (!value) return '—';
  return `${formatDateVi(value)} · ${formatTimeVi(value)}`;
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

/** Pill-style switcher used for the console sections and each section's sub-views. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-white/10">
      {options.map(({ value: optionValue, label, icon: Icon, count }) => {
        const active = optionValue === value;
        return (
          <Pressable
            key={optionValue}
            onPress={() => onChange(optionValue)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-2.5',
              active && 'bg-white dark:bg-[#111827]',
            )}
          >
            {Icon ? <Icon size={14} color={active ? '#537fff' : '#94A3B8'} /> : null}
            <Text
              className={cn(
                'text-xs font-bold',
                active ? 'text-brand dark:text-brand-dark' : 'text-slate-500 dark:text-slate-400',
              )}
              numberOfLines={1}
            >
              {label}
              {count != null ? ` (${count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Long moderation lists render a page at a time; "Xem thêm" reveals the next page. */
export function useShowMore<T>(items: T[], pageSize = PAGE_SIZE) {
  const [limit, setLimit] = useState(pageSize);
  return {
    visible: items.slice(0, limit),
    hasMore: items.length > limit,
    remaining: Math.max(0, items.length - limit),
    showMore: () => setLimit((current) => current + pageSize),
    reset: () => setLimit(pageSize),
  };
}

export function ShowMoreButton({ remaining, onPress }: { remaining: number; onPress: () => void }) {
  if (remaining <= 0) return null;
  return <Button variant="outline" size="sm" label={`Xem thêm (${remaining})`} onPress={onPress} className="self-center" />;
}

export function SectionHeading({ icon: Icon, iconColor, title, hint }: { icon: LucideIcon; iconColor: string; title: string; hint?: string }) {
  return (
    <View className="mb-1 flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-2">
        <Icon size={16} color={iconColor} />
        <Text className="text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {hint ? <Text className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</Text> : null}
    </View>
  );
}

/** Bordered list row shared by every moderation list. */
export function AdminRow({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' }) {
  return (
    <View
      className={cn(
        'gap-3 rounded-2xl border p-4',
        tone === 'success'
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-border bg-white dark:border-border-dark dark:bg-[#111827]',
      )}
    >
      {children}
    </View>
  );
}

export function confirmAction({
  title,
  message,
  confirmLabel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  showAlert(title, message, [
    { text: 'Hủy', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export function showError(error: unknown, fallback = 'Không thực hiện được. Vui lòng thử lại.') {
  showAlert('Lỗi', error instanceof Error ? error.message : fallback);
}
