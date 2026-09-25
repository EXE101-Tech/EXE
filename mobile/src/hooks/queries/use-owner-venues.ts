import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ownerApi } from '@/api/owner';
import type { OwnerScheduleBlockInput, OwnerVenueInput } from '@/schemas/owner';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

export function useOwnerVenuesQuery() {
  const isCourtOwner = useAuthStore((s) => s.user?.isCourtOwner ?? false);
  return useQuery({
    queryKey: queryKeys.owner.venues(),
    queryFn: ownerApi.listVenues,
    enabled: isCourtOwner,
  });
}

function useInvalidateVenueLists() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.owner.venues() });
    queryClient.invalidateQueries({ queryKey: queryKeys.courts.venues() });
    queryClient.invalidateQueries({ queryKey: queryKeys.owner.status() });
  };
}

export function useCreateVenueMutation() {
  const invalidate = useInvalidateVenueLists();
  return useMutation({
    mutationFn: (data: OwnerVenueInput) => ownerApi.createVenue(data),
    onSuccess: invalidate,
  });
}

export function useUpdateVenueMutation(venueId: number) {
  const invalidate = useInvalidateVenueLists();
  return useMutation({
    mutationFn: (data: Partial<OwnerVenueInput>) => ownerApi.updateVenue(venueId, data),
    onSuccess: invalidate,
  });
}

export function useRemoveVenueMutation() {
  const invalidate = useInvalidateVenueLists();
  return useMutation({
    mutationFn: (venueId: number) => ownerApi.removeVenue(venueId),
    onSuccess: invalidate,
  });
}

export function useOwnerScheduleQuery(venueId: number, date: string) {
  return useQuery({
    queryKey: queryKeys.owner.schedule(venueId, date),
    queryFn: () => ownerApi.getSchedule(venueId, date),
    enabled: Number.isFinite(venueId) && !!date,
  });
}

export function useCreateScheduleBlockMutation(venueId: number, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OwnerScheduleBlockInput) => ownerApi.createScheduleBlock(venueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.schedule(venueId, date) });
    },
  });
}

export function useRemoveScheduleBlockMutation(venueId: number, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockId: number) => ownerApi.removeScheduleBlock(venueId, blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.schedule(venueId, date) });
    },
  });
}
