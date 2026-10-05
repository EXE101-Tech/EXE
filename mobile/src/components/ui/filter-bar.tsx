import { Text } from '@/components/ui/text';
import { ChevronDown, ChevronUp, Filter, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { cn } from '@/lib/utils';
import { SelectDropdown, type SelectOption } from './select-dropdown';

export interface FilterBarItem {
  icon: LucideIcon;
  iconColor: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

interface FilterBarProps {
  items: FilterBarItem[];
  /** Buttons shown to the right of the "Bộ lọc" toggle, e.g. create / settings. */
  actions?: ReactNode;
  /** How many filters are currently narrowing the list; shown as a small badge so a collapsed bar is not misleading. */
  activeCount?: number;
}

/**
 * Collapsible filter bar: a "Bộ lọc" toggle plus action buttons on one row, and when expanded one full-width
 * dropdown per filter underneath (mirrors the web filter panel).
 */
export function FilterBar({ items, actions, activeCount = 0 }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <View className="mb-3 gap-2.5 rounded-3xl border border-border bg-white p-2.5 dark:border-border-dark dark:bg-[#0f1729]">
      <View className="flex-row items-center gap-2.5">
        <Pressable
          onPress={() => setOpen((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc"
          accessibilityState={{ expanded: open }}
          className="h-12 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-slate-50 px-3 active:opacity-80 dark:border-border-dark dark:bg-white/5"
        >
          <Filter size={18} color="#94A3B8" />
          <Text className="shrink text-base font-black text-slate-700 dark:text-slate-100" numberOfLines={1}>
            Bộ lọc
          </Text>
          {activeCount > 0 ? (
            <View className="h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 dark:bg-brand-dark">
              <Text className="text-[11px] font-black text-white">{activeCount}</Text>
            </View>
          ) : null}
          <Chevron size={18} color="#94A3B8" />
        </Pressable>
        {actions}
      </View>

      {open ? (
        <Animated.View entering={FadeIn.duration(150)} className="gap-2">
          {items.map((item, index) => (
            <SelectDropdown
              key={index}
              size="md"
              icon={item.icon}
              iconColor={item.iconColor}
              value={item.value}
              options={item.options}
              onChange={item.onChange}
              className="w-full"
            />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

interface FilterActionButtonProps {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  /** `violet` for the secondary action (Thiết lập), `brand` for the primary one (Mở phòng / Thành lập CLB). */
  tone?: 'brand' | 'violet';
}

/** Rounded action button that sits next to the filter toggle. */
export function FilterActionButton({ label, icon: Icon, onPress, tone = 'brand' }: FilterActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={cn(
        'h-12 flex-row items-center justify-center gap-1.5 rounded-2xl border px-3.5 active:opacity-80',
        tone === 'violet'
          ? 'border-violet-400/50 bg-violet-600'
          : 'border-brand/40 bg-brand dark:border-brand-dark/40 dark:bg-brand-dark',
      )}
    >
      <Icon size={18} color="#fff" />
      <Text className="text-sm font-black text-white" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
