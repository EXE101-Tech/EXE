import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '@/api/admin';
import { gameroomsApi } from '@/api/gamerooms';
import { socialApi } from '@/api/social';
import { teamsApi } from '@/api/teams';
import type { AdminAccountCreateInput, ModerationWarningCreateInput, PaymentReviewStatus } from '@/schemas/admin';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

/** Admin queries only run for a signed-in admin, so a stray mount can never fire 403 requests. */
function useAdminEnabled() {
  return useAuthStore((s) => s.isAuthenticated && Boolean(s.user?.isAdmin));
}

export function useAdminSummaryQuery() {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: queryKeys.admin.summary(),
    queryFn: adminApi.getSummary,
    enabled,
    refetchInterval: enabled ? 10_000 : false,
  });
}

export function usePendingPaymentsQuery() {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: queryKeys.admin.payments('PENDING'),
    queryFn: () => adminApi.getPayments('PENDING'),
    enabled,
    refetchInterval: enabled ? 10_000 : false,
  });
}

export type ProcessedPaymentFilter = 'ALL' | 'APPROVED' | 'REJECTED';

/**
 * Transactions an admin has already handled. The server filters by one status at a time, so "all" asks for both
 * and merges them, newest decision first.
 */
export function useProcessedPaymentsQuery(filter: ProcessedPaymentFilter, enabled = true) {
  const isAdmin = useAdminEnabled();
  return useQuery({
    queryKey: queryKeys.admin.payments(`processed-${filter}`),
    queryFn: async () => {
      const lists =
        filter === 'ALL'
          ? await Promise.all([adminApi.getPayments('APPROVED'), adminApi.getPayments('REJECTED')])
          : [await adminApi.getPayments(filter)];
      const decidedAt = (payment: { reviewed_at?: string | null; submitted_at: string }) =>
        new Date(payment.reviewed_at ?? payment.submitted_at).getTime();
      return lists.flat().sort((a, b) => decidedAt(b) - decidedAt(a));
    },
    enabled: isAdmin && enabled,
  });
}

export function usePremiumAccountsQuery() {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: queryKeys.admin.premiumAccounts(),
    queryFn: adminApi.getPremiumAccounts,
    enabled,
  });
}

export function useAdminAccountsQuery() {
  const enabled = useAdminEnabled();
  return useQuery({ queryKey: queryKeys.admin.accounts(), queryFn: adminApi.getAccounts, enabled });
}

export function useAdminUsersQuery() {
  const enabled = useAdminEnabled();
  return useQuery({ queryKey: queryKeys.admin.users(), queryFn: adminApi.getUsers, enabled });
}

export function useAdminPostsQuery() {
  const enabled = useAdminEnabled();
  return useQuery({ queryKey: queryKeys.admin.posts(), queryFn: adminApi.getPosts, enabled });
}

export function useAdminRoomsQuery() {
  const enabled = useAdminEnabled();
  return useQuery({ queryKey: queryKeys.admin.rooms(), queryFn: adminApi.getRooms, enabled });
}

export function useAdminTeamsQuery() {
  const enabled = useAdminEnabled();
  return useQuery({ queryKey: queryKeys.admin.teams(), queryFn: () => teamsApi.getAll(), enabled });
}

/** Refetches every admin list (and the counters on top) after something changed. */
export function useRefreshAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin'] });
}

export function useReviewPaymentMutation() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: PaymentReviewStatus }) => adminApi.reviewPayment(id, status),
    onSuccess: refresh,
  });
}

export function useRevokePremiumMutation() {
  const refresh = useRefreshAdmin();
  return useMutation({ mutationFn: (userId: number) => adminApi.revokePremium(userId), onSuccess: refresh });
}

export function useCreateAdminAccountMutation() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: (data: AdminAccountCreateInput) => adminApi.createAccount(data),
    onSuccess: refresh,
  });
}

export function useDeleteAdminAccountMutation() {
  const refresh = useRefreshAdmin();
  return useMutation({ mutationFn: (id: number) => adminApi.deleteAccount(id), onSuccess: refresh });
}

export function useDeleteUserMutation() {
  const refresh = useRefreshAdmin();
  return useMutation({ mutationFn: (id: number) => adminApi.deleteUser(id), onSuccess: refresh });
}

export type ModeratedContent = 'post' | 'room' | 'team';

/** Posts, rooms and clubs are removed through their regular endpoints, which the server lets admins call. */
export function useDeleteContentMutation() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: ({ type, id }: { type: ModeratedContent; id: number }) => {
      if (type === 'post') return socialApi.remove(id);
      if (type === 'room') return gameroomsApi.remove(id);
      return teamsApi.remove(id);
    },
    onSuccess: refresh,
  });
}

export function useSendWarningMutation() {
  return useMutation({ mutationFn: (data: ModerationWarningCreateInput) => adminApi.sendWarning(data) });
}
