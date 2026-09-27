import { Text, View, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva('flex-row items-center self-start rounded-lg px-2 py-1', {
  variants: {
    variant: {
      default: 'bg-brand/10 dark:bg-brand-dark/10',
      success: 'bg-emerald-500/10',
      warning: 'bg-amber-500/10',
      danger: 'bg-rose-500/10',
      neutral: 'bg-slate-500/10',
    },
  },
  defaultVariants: { variant: 'default' },
});

const badgeTextVariants = cva('text-xs font-bold', {
  variants: {
    variant: {
      default: 'text-brand dark:text-brand-dark',
      success: 'text-emerald-600 dark:text-emerald-400',
      warning: 'text-amber-600 dark:text-amber-400',
      danger: 'text-rose-600 dark:text-rose-400',
      neutral: 'text-slate-600 dark:text-slate-300',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  label: string;
  textClassName?: string;
}

export function Badge({ variant, label, className, textClassName, ...props }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      <Text className={cn(badgeTextVariants({ variant }), textClassName)}>{label}</Text>
    </View>
  );
}
