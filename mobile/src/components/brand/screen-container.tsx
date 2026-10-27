import { useCallback, useEffect, useRef, type PropsWithChildren, type ReactElement } from 'react';
import { ScrollView, View, type RefreshControlProps, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardScrollContext, scrollFocusedInputIntoView } from '@/components/ui/keyboard-scroll';
import { useKeyboardHeight } from '@/hooks/use-keyboard';
import { cn } from '@/lib/utils';

interface ScreenContainerProps extends PropsWithChildren<ViewProps> {
  scroll?: boolean;
  /** Pull-to-refresh, only applied when the container scrolls. */
  refreshControl?: ReactElement<RefreshControlProps>;
}

/** Consistent safe-area + padding wrapper, background follows the brand bg token in both themes. */
export function ScreenContainer({ children, className, scroll = true, refreshControl, ...props }: ScreenContainerProps) {
  // While the keyboard is open the form gets room to scroll above it, and the field being typed in is brought up.
  const scrollRef = useRef<ScrollView>(null);
  const keyboardHeight = useKeyboardHeight();
  const scrollToFocused = useCallback(() => {
    setTimeout(() => scrollFocusedInputIntoView(scrollRef), 120);
  }, []);
  useEffect(() => {
    if (keyboardHeight > 0) scrollToFocused();
  }, [keyboardHeight, scrollToFocused]);

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          // ScrollView forbids layout props (justifyContent, gap, etc.) on its own style —
          // they must go on the content container instead, hence this separate prop.
          contentContainerClassName={cn('flex-grow px-4 pb-8', className)}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          {...props}
        >
          <KeyboardScrollContext.Provider value={scrollToFocused}>{children}</KeyboardScrollContext.Provider>
          {keyboardHeight > 0 ? <View style={{ height: keyboardHeight }} /> : null}
        </ScrollView>
      ) : (
        <View className={cn('flex-1 px-4', className)} {...props}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
