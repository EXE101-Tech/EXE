import { useQuery } from '@tanstack/react-query';

import { courtsApi } from '@/api/courts';
import { queryKeys } from './keys';

export function useVenuesQuery() {
  return useQuery({
    queryKey: queryKeys.courts.venues(),
    queryFn: courtsApi.getVenues,
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
