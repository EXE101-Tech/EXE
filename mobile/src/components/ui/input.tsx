import * as React from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { cn } from '@/lib/utils';

export interface InputProps extends TextInputProps {
  error?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, containerClassName, error, ...props }, ref) => (
    <View className={containerClassName}>
      <TextInput
        ref={ref}
        placeholderTextColor="#94A3B8"
        className={cn(
          'h-12 rounded-xl border border-border bg-white px-4 text-base text-slate-900 dark:border-border-dark dark:bg-[#0A1A30] dark:text-white',
          error && 'border-rose-500',
          className,
        )}
        {...props}
      />
      {error ? <Text className="mt-1 text-xs font-semibold text-rose-500">{error}</Text> : null}
    </View>
  ),
);
Input.displayName = 'Input';
