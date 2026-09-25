import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

/** Pauses refetchInterval polling (chat/notifications) while the app is backgrounded. */
export function wireAppStateToQueryFocus() {
  function onChange(status: AppStateStatus) {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  }
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}
