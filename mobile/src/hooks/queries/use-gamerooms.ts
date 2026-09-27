import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { gameroomsApi, type GameroomFilters } from '@/api/gamerooms';
import type { MatchCreateInput } from '@/schemas/gamerooms';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

export function useGameroomsQuery(filters: GameroomFilters = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.gamerooms.list(filters),
    queryFn: () => gameroomsApi.getAll(filters),
    enabled: isAuthenticated,
  });
}

export function useGameroomQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.gamerooms.detail(id),
    queryFn: () => gameroomsApi.getById(id),
    enabled: Number.isFinite(id),
  });
}

function useInvalidateGameroomLists() {
  const queryClient = useQueryClient();
  return (id?: number) => {
    queryClient.invalidateQueries({ queryKey: ['gamerooms', 'list'] });
    if (id != null) queryClient.invalidateQueries({ queryKey: queryKeys.gamerooms.detail(id) });
  };
}

export function useCreateGameroomMutation() {
  const invalidate = useInvalidateGameroomLists();
  return useMutation({
    mutationFn: (data: MatchCreateInput) => gameroomsApi.create(data),
    onSuccess: () => invalidate(),
  });
}

export function useJoinGameroomMutation() {
  const invalidate = useInvalidateGameroomLists();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => gameroomsApi.join(id, note),
    onSuccess: (_res, { id }) => invalidate(id),
  });
}

export function useLeaveGameroomMutation() {
  const invalidate = useInvalidateGameroomLists();
  return useMutation({
    mutationFn: (id: number) => gameroomsApi.leave(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useSetGameroomParticipantStatusMutation(id: number) {
  const invalidate = useInvalidateGameroomLists();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: 'APPROVED' | 'REJECTED' }) =>
      gameroomsApi.setParticipantStatus(id, userId, status),
    onSuccess: () => invalidate(id),
  });
}
