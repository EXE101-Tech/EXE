import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { premiumApi } from '@/api/premium';
import type { PremiumPaymentSubmitInput } from '@/schemas/premium';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

/**
 * The member's own Premium transactions (newest first, max 20). It polls because the admin approves or rejects
 * out-of-band and the user should see the result without leaving the screen.
 */
export function useMyPaymentsQuery() {
  const enabled = useAuthStore((s) => s.isAuthenticated && !s.user?.isAdmin);
  return useQuery({
    queryKey: queryKeys.premium.mine(),
    queryFn: premiumApi.getMine,
    enabled,
    refetchInterval: enabled ? 10_000 : false,
  });
}

export function useCreatePaymentIntentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: premiumApi.createPaymentIntent,
    // Opening the payment popup creates (or reuses) an unsent transaction, which the history lists as a reminder.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.premium.mine() }),
  });
}

export function useSubmitPaymentProofMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PremiumPaymentSubmitInput }) =>
      premiumApi.submitPaymentProof(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.premium.mine() }),
  });
}
