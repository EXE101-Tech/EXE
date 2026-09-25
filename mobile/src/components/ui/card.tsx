import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'rounded-3xl border border-border bg-white dark:border-border-dark dark:bg-[#0F1E36]',
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('p-4', className)} {...props} />;
}
