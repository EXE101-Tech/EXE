import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { lfgApi, type LfgFilters } from '@/api/lfg';
import type { LfgPostCreateInput, LfgPostUpdateInput } from '@/schemas/lfg';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

export function useLfgPostsQuery(filters: LfgFilters = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.lfg.list(filters),
    queryFn: () => lfgApi.getAll(filters),
    enabled: isAuthenticated,
  });
}

function useInvalidateLfgLists() {
  const queryClient = useQueryClient();
  return (id?: number) => {
    queryClient.invalidateQueries({ queryKey: ['lfg', 'list'] });
    if (id != null) queryClient.invalidateQueries({ queryKey: queryKeys.lfg.detail(id) });
  };
}

export function useCreateLfgPostMutation() {
  const invalidate = useInvalidateLfgLists();
  return useMutation({
    mutationFn: (data: LfgPostCreateInput) => lfgApi.create(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateLfgPostMutation() {
  const invalidate = useInvalidateLfgLists();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LfgPostUpdateInput }) => lfgApi.update(id, data),
    onSuccess: (_res, { id }) => invalidate(id),
  });
}

export function useJoinLfgPostMutation() {
  const invalidate = useInvalidateLfgLists();
  return useMutation({
    mutationFn: (id: number) => lfgApi.join(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useLeaveLfgPostMutation() {
  const invalidate = useInvalidateLfgLists();
  return useMutation({
    mutationFn: (id: number) => lfgApi.leave(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useCancelLfgPostMutation() {
  const invalidate = useInvalidateLfgLists();
  return useMutation({
    mutationFn: (id: number) => lfgApi.cancel(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useLfgParticipantsQuery(id: number, status = 'PENDING') {
  return useQuery({
    queryKey: queryKeys.lfg.participants(id, status),
    queryFn: () => lfgApi.getParticipants(id, status),
    enabled: Number.isFinite(id),
  });
}

export function useSetLfgParticipantStatusMutation(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLfgLists();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: 'APPROVED' | 'REJECTED' }) =>
      lfgApi.setParticipantStatus(id, userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lfg', 'participants', id] });
      invalidate(id);
    },
  });
}
