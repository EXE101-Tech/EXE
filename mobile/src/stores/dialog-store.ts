import { create } from 'zustand';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
}

interface DialogState {
  /** Dialogs wait here; the first one is on screen and the rest follow as it is answered. */
  queue: DialogRequest[];
  dismiss: () => void;
}

let nextId = 1;

export const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  dismiss: () => set((state) => ({ queue: state.queue.slice(1) })),
}));

/**
 * Drop-in replacement for React Native's `Alert.alert(title, message, buttons)` that renders the app's own
 * styled dialog instead of the system one. Buttons keep the same `{ text, style, onPress }` shape.
 */
export function showAlert(title: string, message?: string, buttons?: DialogButton[]) {
  const request: DialogRequest = {
    id: nextId++,
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'Đóng' }],
  };
  useDialogStore.setState((state) => ({ queue: [...state.queue, request] }));
}
