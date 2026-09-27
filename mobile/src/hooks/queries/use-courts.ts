import { useQuery } from '@tanstack/react-query';

import { courtsApi } from '@/api/courts';
import { queryKeys } from './keys';

export function useVenuesQuery() {
  return useQuery({
    queryKey: queryKeys.courts.venues(),
    queryFn: courtsApi.getVenues,
  });
}

export function useVenueQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.courts.venue(id),
    queryFn: () => courtsApi.getVenueById(id),
    enabled: Number.isFinite(id),
  });
}

export function useSportsQuery() {
  return useQuery({
    queryKey: queryKeys.courts.sports(),
    queryFn: courtsApi.getSports,
  });
}

export function useCourtsQuery(filters: { venue_id?: number; sport_id?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.courts.list(filters),
    queryFn: () => courtsApi.getAll(filters),
  });
}

export function useCourtQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.courts.detail(id),
    queryFn: () => courtsApi.getById(id),
    enabled: Number.isFinite(id),
  });
}

export function useNearbyVenuesQuery(lat: number, lng: number, radius = 5) {
  return useQuery({
    queryKey: queryKeys.courts.nearby(lat, lng, radius),
    queryFn: () => courtsApi.getNearby(lat, lng, radius),
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  });
}
