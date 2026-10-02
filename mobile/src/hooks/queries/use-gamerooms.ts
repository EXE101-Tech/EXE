import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { gameroomsApi, type GameroomFilters } from '@/api/gamerooms';
import type { MatchAttendanceStatus, MatchCreateInput, RoomSearchPreferenceInput } from '@/schemas/gamerooms';
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

/** The caller own rooms, including finished/cancelled ones that the public list hides. */
export function useMyGameroomsQuery(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.gamerooms.mine(),
    queryFn: gameroomsApi.getMine,
    enabled: isAuthenticated && enabled,
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

export function useUpdateGameroomMutation() {
  const invalidate = useInvalidateGameroomLists();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MatchCreateInput }) => gameroomsApi.update(id, data),
    onSuccess: (_res, { id }) => invalidate(id),
  });
}

export function useDeleteGameroomMutation() {
  const invalidate = useInvalidateGameroomLists();
  return useMutation({
    mutationFn: (id: number) => gameroomsApi.remove(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useJoinGameroomMutation() {
  const invalidate = useInvalidateGameroomLists();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => gameroomsApi.join(id, note),
    onSuccess: (_res, { id }) => invalidate(id),
  });
}

export function useRespondInviteMutation() {
  const invalidate = useInvalidateGameroomLists();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'ACCEPT' | 'REJECT' }) => gameroomsApi.respondInvite(id, action),
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

export function useUpdateAttendanceMutation(id: number) {
  const invalidate = useInvalidateGameroomLists();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: MatchAttendanceStatus }) =>
      gameroomsApi.updateAttendance(id, userId, status),
    onSuccess: () => invalidate(id),
  });
}

/** Premium-only: the server answers 403 for everyone else, so callers pass enabled={isPremium}. */
export function useAutoSearchQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.gamerooms.autoSearch(),
    queryFn: gameroomsApi.getAutoSearch,
    enabled,
  });
}

export function useSaveAutoSearchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RoomSearchPreferenceInput) => gameroomsApi.saveAutoSearch(data),
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.gamerooms.autoSearch(), saved),
  });
}

export function useRemoveAutoSearchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gameroomsApi.removeAutoSearch,
    onSuccess: () => queryClient.setQueryData(queryKeys.gamerooms.autoSearch(), null),
  });
}
