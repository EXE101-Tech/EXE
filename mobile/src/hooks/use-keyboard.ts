import { useEffect, useState } from 'react';
import { Keyboard, type LayoutChangeEvent } from 'react-native';

/** Height of the on-screen keyboard in dp, 0 while it is hidden. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/**
 * How far the bottom of a view has to be lifted so the keyboard does not cover it.
 *
 * Put `onLayout` on the view whose bottom edge matters and add `inset` as its bottom padding. When the system
 * already shrank that view for the keyboard (the layout got shorter by about the keyboard height) the inset is 0,
 * so the content is never lifted twice. `bottomGap` is whatever sits between the view and the screen bottom
 * (for example the tab bar): the keyboard only needs to push the view up by what it covers beyond that.
 */
export function useKeyboardInset(bottomGap = 0) {
  const keyboardHeight = useKeyboardHeight();
  const [baseHeight, setBaseHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setLayoutHeight(height);
    // The height without the keyboard is the reference for telling whether the system resized the view.
    if (keyboardHeight === 0) setBaseHeight(height);
  };

  const resizedBySystem = keyboardHeight > 0 && baseHeight > 0 && baseHeight - layoutHeight > keyboardHeight / 2;
  const inset = keyboardHeight > 0 && !resizedBySystem ? Math.max(0, keyboardHeight - bottomGap) : 0;

  return { inset, keyboardHeight, onLayout };
}
