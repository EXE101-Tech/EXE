import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

export function useMeStatsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.auth.stats(),
    queryFn: authApi.getMeStats,
    enabled: isAuthenticated,
  });
}

export function useUpdateProfileMutation() {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.stats() });
    },
  });
}
