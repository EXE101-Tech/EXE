import { Text } from '@/components/ui/text';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClassName: string;
  iconColor: string;
  /** Makes the card a button, for example one that opens the list the number counts. */
  onPress?: () => void;
  /** Link-like line under the label of a pressable card. */
  hint?: string;
}

const CARD_CLASS =
  'flex-1 basis-[47%] rounded-2xl border border-border bg-slate-50/80 p-3.5 dark:border-border-dark dark:bg-slate-900/30';

export function StatCard({ label, value, icon: Icon, colorClassName, iconColor, onPress, hint }: StatCardProps) {
  const content = (
    <>
      <View className={cn('mb-2 h-8 w-8 items-center justify-center rounded-xl', colorClassName)}>
        <Icon size={16} color={iconColor} />
      </View>
      <Text className="text-2xl font-black text-slate-900 dark:text-white">{value}</Text>
      <Text className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</Text>
      {onPress && hint ? (
        <View className="mt-1 flex-row items-center gap-0.5">
          <Text className="text-xs font-bold text-brand dark:text-brand-dark">{hint}</Text>
          <ChevronRight size={13} color="#537fff" />
        </View>
      ) : null}
    </>
  );

  if (!onPress) return <View className={CARD_CLASS}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className={cn(CARD_CLASS, 'active:opacity-80')}>
      {content}
    </Pressable>
  );
}
