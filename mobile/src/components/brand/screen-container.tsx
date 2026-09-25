import { type PropsWithChildren } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';

interface ScreenContainerProps extends PropsWithChildren<ViewProps> {
  scroll?: boolean;
}

/** Consistent safe-area + padding wrapper, background follows the brand bg token in both themes. */
export function ScreenContainer({ children, className, scroll = true, ...props }: ScreenContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          className="flex-1"
          // ScrollView forbids layout props (justifyContent, gap, etc.) on its own style —
          // they must go on the content container instead, hence this separate prop.
          contentContainerClassName={cn('flex-grow px-4 pb-8', className)}
          keyboardShouldPersistTaps="handled"
          {...props}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn('flex-1 px-4', className)} {...props}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
