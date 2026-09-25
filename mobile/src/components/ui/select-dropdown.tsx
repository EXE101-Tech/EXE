import { ChevronDown, type LucideIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, type View as RNView } from 'react-native';

import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
}

interface SelectDropdownProps {
  icon?: LucideIcon;
  iconColor?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

/** Anchored dropdown: a filter pill that opens a list positioned right under itself. */
export function SelectDropdown({ icon: Icon, iconColor = '#94A3B8', value, options, onChange, className }: SelectDropdownProps) {
  const triggerRef = useRef<RNView>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const selected = options.find((o) => o.value === value);

  const handleOpen = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={handleOpen}
        className={cn(
          'h-10 flex-row items-center gap-1.5 rounded-xl border border-border bg-slate-50 px-3 dark:border-border-dark dark:bg-white/5',
          className,
        )}
      >
        {Icon ? <Icon size={14} color={iconColor} /> : null}
        <Text className="flex-1 text-xs font-bold text-slate-700 dark:text-slate-200" numberOfLines={1}>
          {selected?.emoji ? `${selected.emoji} ` : ''}
          {selected?.label ?? '—'}
        </Text>
        <ChevronDown size={14} color="#94A3B8" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1" onPress={() => setOpen(false)}>
          <View
            style={{ position: 'absolute', top: anchor.y + anchor.height + 4, left: anchor.x, width: Math.max(anchor.width, 180) }}
            className="max-h-72 overflow-hidden rounded-2xl border border-border bg-white shadow-lg dark:border-border-dark dark:bg-[#0F1E36]"
          >
            <ScrollView bounces={false}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex-row items-center gap-2 px-4 py-3',
                      isSelected && 'bg-brand/10 dark:bg-brand-dark/10',
                    )}
                  >
                    {option.emoji ? <Text className="text-base">{option.emoji}</Text> : null}
                    <Text
                      className={cn(
                        'flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200',
                        isSelected && 'font-black text-brand dark:text-brand-dark',
                      )}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
