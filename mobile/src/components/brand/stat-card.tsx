import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClassName: string;
  iconColor: string;
}

export function StatCard({ label, value, icon: Icon, colorClassName, iconColor }: StatCardProps) {
  return (
    <View className="flex-1 basis-[47%] rounded-2xl border border-border bg-slate-50/80 p-3.5 dark:border-border-dark dark:bg-slate-900/30">
      <View className={cn('mb-2 h-8 w-8 items-center justify-center rounded-xl', colorClassName)}>
        <Icon size={16} color={iconColor} />
      </View>
      <Text className="text-2xl font-black text-slate-900 dark:text-white">{value}</Text>
      <Text className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}
