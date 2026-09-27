import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { teamsApi, type TeamFilters } from '@/api/teams';
import type { TeamCreateInput, TeamReviewCreateInput, TeamUpdateInput } from '@/schemas/teams';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

export function useTeamsQuery(filters: TeamFilters = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.teams.list(filters),
    queryFn: () => teamsApi.getAll(filters),
    enabled: isAuthenticated,
  });
}

function useInvalidateTeamLists() {
  const queryClient = useQueryClient();
  return (id?: number) => {
    queryClient.invalidateQueries({ queryKey: ['teams', 'list'] });
    if (id != null) queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(id) });
  };
}

export function useCreateTeamMutation() {
  const invalidate = useInvalidateTeamLists();
  return useMutation({
    mutationFn: (data: TeamCreateInput) => teamsApi.create(data),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTeamMutation() {
  const invalidate = useInvalidateTeamLists();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TeamUpdateInput }) => teamsApi.update(id, data),
    onSuccess: (_res, { id }) => invalidate(id),
  });
}

export function useRemoveTeamMutation() {
  const invalidate = useInvalidateTeamLists();
  return useMutation({
    mutationFn: (id: number) => teamsApi.remove(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useJoinTeamMutation() {
  const invalidate = useInvalidateTeamLists();
  return useMutation({
    mutationFn: (id: number) => teamsApi.join(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useLeaveTeamMutation() {
  const invalidate = useInvalidateTeamLists();
  return useMutation({
    mutationFn: (id: number) => teamsApi.leave(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useTeamMembersQuery(id: number, status?: string) {
  return useQuery({
    queryKey: queryKeys.teams.members(id, status),
    queryFn: () => teamsApi.getMembers(id, status),
    enabled: Number.isFinite(id),
  });
}

export function useSetTeamMemberStatusMutation(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTeamLists();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: 'APPROVED' | 'REJECTED' }) =>
      teamsApi.setMemberStatus(id, userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', 'members', id] });
      invalidate(id);
    },
  });
}

export function useTeamReviewsQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.teams.reviews(id),
    queryFn: () => teamsApi.getReviews(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateTeamReviewMutation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TeamReviewCreateInput) => teamsApi.review(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.reviews(id) });
      queryClient.invalidateQueries({ queryKey: ['teams', 'list'] });
    },
  });
}
