import { createContext, type RefObject } from 'react';
import { ScrollView, TextInput } from 'react-native';

/** The content view of a ScrollView: React Native implements it, its type declarations only list the older node API. */
type WithInnerViewRef = { getInnerViewRef?: () => Parameters<TextInput['measureLayout']>[0] | null };

/** Lets an `Input` ask the scrolling container it sits in to bring it clear of the keyboard when it gets focus. */
export const KeyboardScrollContext = createContext<(() => void) | null>(null);

/**
 * Scrolls `scrollRef` so the text input that has focus sits near the top of the visible area, above the keyboard.
 * Call it once the layout has settled after the keyboard opened. Does nothing if the focused input is elsewhere.
 */
export function scrollFocusedInputIntoView(scrollRef: RefObject<ScrollView | null>) {
  const scrollView = scrollRef.current;
  const input = TextInput.State.currentlyFocusedInput();
  const content = (scrollView as unknown as WithInnerViewRef | null)?.getInnerViewRef?.();
  if (!scrollView || !input || !content) return;
  input.measureLayout(
    content,
    (_x, y) => scrollView.scrollTo({ y: Math.max(0, y - 80), animated: true }),
    () => {},
  );
}
