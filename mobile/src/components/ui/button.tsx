import * as React from 'react';
import { ActivityIndicator, Pressable, type PressableProps, Text } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-xl active:opacity-80', {
  variants: {
    variant: {
      default: 'bg-brand dark:bg-brand-dark',
      outline: 'border border-border dark:border-border-dark bg-transparent',
      ghost: 'bg-transparent',
      destructive: 'bg-rose-500',
    },
    size: {
      default: 'h-12 px-5',
      sm: 'h-9 px-3',
      lg: 'h-14 px-6',
      icon: 'h-10 w-10',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

const buttonTextVariants = cva('text-center font-bold', {
  variants: {
    variant: {
      default: 'text-white',
      outline: 'text-slate-900 dark:text-white',
      ghost: 'text-slate-900 dark:text-white',
      destructive: 'text-white',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  label?: string;
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  ({ className, textClassName, variant, size, label, loading, disabled, children, ...props }, ref) => (
    <Pressable
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), (disabled || loading) && 'opacity-50', className)}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#0EA5E9' : '#fff'} />
      ) : label ? (
        <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>{label}</Text>
      ) : (
        children
      )}
    </Pressable>
  ),
);
Button.displayName = 'Button';
