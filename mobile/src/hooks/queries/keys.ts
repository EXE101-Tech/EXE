// Centralized React Query key factory, grouped to mirror src/api/*.ts modules.
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
    stats: () => ['auth', 'stats'] as const,
  },
  owner: {
    status: () => ['owner', 'status'] as const,
    venues: () => ['owner', 'venues'] as const,
    schedule: (venueId: number, date: string) => ['owner', 'schedule', venueId, date] as const,
  },
  courts: {
    venues: () => ['courts', 'venues'] as const,
    venue: (id: number) => ['courts', 'venue', id] as const,
  },
  bookings: {
    list: () => ['bookings', 'list'] as const,
    availability: (venueId: number, date: string) => ['bookings', 'availability', venueId, date] as const,
  },
  search: {
    results: (q: string) => ['search', 'results', q] as const,
  },
  notifications: {
    list: () => ['notifications', 'list'] as const,
  },
};
