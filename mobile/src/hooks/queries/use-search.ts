import { useQuery } from '@tanstack/react-query';

import { searchApi } from '@/api/search';
import { queryKeys } from './keys';

export function useSearchQuery(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: queryKeys.search.results(term),
    queryFn: () => searchApi.search(term),
    enabled: term.length >= 2,
  });
}
