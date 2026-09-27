import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-8 dark:border-border-dark">
      {Icon ? <Icon size={28} color="#94A3B8" /> : null}
      <Text className="text-center text-sm font-bold text-slate-500 dark:text-slate-400">{title}</Text>
      {description ? (
        <Text className="text-center text-xs text-slate-400 dark:text-slate-500">{description}</Text>
      ) : null}
    </View>
  );
}
