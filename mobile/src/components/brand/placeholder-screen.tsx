import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { ScreenContainer } from './screen-container';

interface PlaceholderScreenProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Placeholder for tabs not yet built (phases 3–6 of the mobile rebuild plan). */
export function PlaceholderScreen({ icon: Icon, title, description }: PlaceholderScreenProps) {
  return (
    <ScreenContainer scroll={false} className="items-center justify-center gap-3">
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 dark:bg-brand-dark/10">
        <Icon size={28} color="#0EA5E9" />
      </View>
      <Text className="text-xl font-black text-slate-900 dark:text-white">{title}</Text>
      <Text className="text-center text-sm text-slate-500 dark:text-slate-400">{description}</Text>
    </ScreenContainer>
  );
}
