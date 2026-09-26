import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { bookingsApi } from '@/api/bookings';
import type { BookingCreateInput } from '@/schemas/bookings';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

export function useBookingsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.bookings.list(),
    queryFn: bookingsApi.getAll,
    enabled: isAuthenticated,
  });
}

export function useBookingQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: () => bookingsApi.getById(id),
    enabled: Number.isFinite(id),
  });
}

export function useAvailabilityQuery(venueId: number, date: string) {
  return useQuery({
    queryKey: queryKeys.bookings.availability(venueId, date),
    queryFn: () => bookingsApi.getAvailability(venueId, date),
    enabled: Number.isFinite(venueId) && !!date,
  });
}

export function useCreateBookingMutation(venueId: number, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BookingCreateInput) => bookingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.availability(venueId, date) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.stats() });
    },
  });
}

export function useCreateBookingBatchMutation(venueId: number, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookings: BookingCreateInput[]) => bookingsApi.createBatch(bookings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.availability(venueId, date) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.stats() });
    },
  });
}

export function useCancelBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.list() });
    },
  });
}
