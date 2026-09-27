import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import { ownerApi } from '@/api/owner';
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

export function useOwnerStatusQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.owner.status(),
    queryFn: ownerApi.getStatus,
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

export function useOwnerRegistrationMutation() {
  const applyOwnerRegistration = useAuthStore((s) => s.applyOwnerRegistration);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyOwnerRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.status() });
    },
  });
}

export function useOwnerCancellationMutation() {
  const cancelOwnerRegistration = useAuthStore((s) => s.cancelOwnerRegistration);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelOwnerRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.status() });
    },
  });
}
