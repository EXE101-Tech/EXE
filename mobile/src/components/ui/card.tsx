import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'rounded-lg border border-[#DCE5DB] bg-white dark:border-[#34453A] dark:bg-[#1C2A21]',
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('p-4', className)} {...props} />;
}
