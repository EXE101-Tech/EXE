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
