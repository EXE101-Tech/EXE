import { createContext, useContext } from 'react';

/**
 * Lets a child that handles its own drag gestures (an embedded map) pause the scrolling of the form it sits in,
 * so panning the map does not scroll the form instead. PopupModal provides it; outside a popup it does nothing.
 */
export const ScrollLockContext = createContext<(locked: boolean) => void>(() => {});

export function useScrollLock() {
  return useContext(ScrollLockContext);
}
