import type { LucideIcon } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import { cn } from '@/lib/utils';
import { useResolvedColorScheme } from '@/stores/theme-store';
import { colors } from '@/theme/colors';
import { SelectDropdown, type SelectOption } from './select-dropdown';

export interface FilterSelectItem {
  kind?: 'select';
  icon: LucideIcon;
  iconColor: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

/** A single-choice pill (not a dropdown) — e.g. a scope tab shown as its own grid slot. */
export interface FilterToggleItem {
  kind: 'toggle';
  icon: LucideIcon;
  iconColor: string;
  label: string;
  active: boolean;
  onPress: () => void;
}

export type FilterGridItem = FilterSelectItem | FilterToggleItem;

/** Lays out filter controls two-per-row, matching the web filter bar's grouping. */
export function FilterGrid({ items }: { items: FilterGridItem[] }) {
  const scheme = useResolvedColorScheme();
  const brandColor = colors[scheme].brand;

  const rows: FilterGridItem[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View className="mb-3 gap-2">
      {rows.map((row, index) => (
        <View key={index} className="flex-row gap-2">
          {row.map((item, itemIndex) =>
            item.kind === 'toggle' ? (
              <TouchableOpacity
                key={itemIndex}
                onPress={item.onPress}
                className={cn(
                  'h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-3',
                  item.active
                    ? 'border-brand bg-brand/10 dark:border-brand-dark dark:bg-brand-dark/15'
                    : 'border-border bg-slate-50 dark:border-border-dark dark:bg-white/5',
                )}
              >
                <item.icon size={14} color={item.active ? brandColor : item.iconColor} />
                <Text
                  numberOfLines={1}
                  className={cn(
                    'flex-1 text-xs font-bold',
                    item.active ? 'text-brand dark:text-brand-dark' : 'text-slate-700 dark:text-slate-200',
                  )}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ) : (
              <SelectDropdown
                key={itemIndex}
                icon={item.icon}
                iconColor={item.iconColor}
                value={item.value}
                options={item.options}
                onChange={item.onChange}
                className="flex-1"
              />
            ),
          )}
        </View>
      ))}
    </View>
  );
}
