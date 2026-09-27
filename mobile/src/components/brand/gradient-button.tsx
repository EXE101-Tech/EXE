import * as React from 'react';
import { ActivityIndicator, Pressable, type PressableProps, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { cn } from '@/lib/utils';
import { ctaGradient } from '@/theme/colors';

export interface GradientButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

/** Primary CTA style used across the app (mirrors web's `from-[#74C365] to-[#589470]` gradient buttons). */
export function GradientButton({ label, loading, icon, className, disabled, ...props }: GradientButtonProps) {
  return (
    <Pressable
      disabled={disabled || loading}
      className={cn('overflow-hidden rounded-xl', (disabled || loading) && 'opacity-50', className)}
      {...props}
    >
      <LinearGradient
        colors={ctaGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon}
            <Text className="text-base font-bold text-white">{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}
