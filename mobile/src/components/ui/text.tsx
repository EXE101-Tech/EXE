import { forwardRef, type ComponentRef } from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import { cn } from '@/lib/utils';

const weightFontClass: Record<string, string> = {
  thin: 'font-inter-thin',
  extralight: 'font-inter-extralight',
  light: 'font-inter-light',
  normal: 'font-inter-normal',
  medium: 'font-inter-medium',
  semibold: 'font-inter-semibold',
  bold: 'font-inter-bold',
  extrabold: 'font-inter-extrabold',
  black: 'font-inter-black',
};

interface InterTextProps extends TextProps {
  className?: string;
}

export const Text = forwardRef<ComponentRef<typeof NativeText>, InterTextProps>(
  ({ className, ...props }, ref) => {
    const weight = className?.match(/(?:^|\s)(?:[\w-]+:)*font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?:\s|$)/)?.[1];
    return <NativeText ref={ref} {...props} className={cn(className, weightFontClass[weight ?? ''] || 'font-sans')} />;
  },
);

Text.displayName = 'InterText';
