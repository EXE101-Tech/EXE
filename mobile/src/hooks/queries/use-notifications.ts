import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationsApi } from '@/api/notifications';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

export function useNotificationsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: notificationsApi.list,
    enabled: isAuthenticated,
  });
}

/** Lightweight accessor for the top navbar's bell badge — reuses the same list query/cache. */
export function useUnreadCountQuery() {
  const { data } = useNotificationsQuery();
  return data?.unread_count ?? 0;
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });
}
