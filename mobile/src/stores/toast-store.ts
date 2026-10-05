import { create } from 'zustand';

export type ToastTone = 'success' | 'info';

interface ToastState {
  toast: { id: number; message: string; tone: ToastTone } | null;
  hide: () => void;
}

const DISMISS_AFTER_MS = 4000;

let nextId = 1;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  hide: () => set({ toast: null }),
}));

/**
 * Short confirmation shown at the top of the screen (web: the green "toast" after an action succeeds).
 * Callable from anywhere, including mutation callbacks. A newer toast replaces the one on screen.
 */
export function showToast(message: string, tone: ToastTone = 'success') {
  if (dismissTimer) clearTimeout(dismissTimer);
  const id = nextId++;
  useToastStore.setState({ toast: { id, message, tone } });
  dismissTimer = setTimeout(() => {
    // Only clear our own toast; a newer one has its own timer.
    if (useToastStore.getState().toast?.id === id) useToastStore.setState({ toast: null });
  }, DISMISS_AFTER_MS);
}
