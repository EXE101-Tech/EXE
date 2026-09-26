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
    sports: () => ['courts', 'sports'] as const,
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
  lfg: {
    list: <T extends object>(filters?: T) => ['lfg', 'list', filters ?? {}] as const,
    detail: (id: number) => ['lfg', 'detail', id] as const,
    participants: (id: number, status: string) => ['lfg', 'participants', id, status] as const,
  },
  teams: {
    list: <T extends object>(filters?: T) => ['teams', 'list', filters ?? {}] as const,
    detail: (id: number) => ['teams', 'detail', id] as const,
    members: (id: number, status?: string) => ['teams', 'members', id, status ?? 'all'] as const,
    reviews: (id: number) => ['teams', 'reviews', id] as const,
  },
  gamerooms: {
    list: <T extends object>(filters?: T) => ['gamerooms', 'list', filters ?? {}] as const,
    detail: (id: number) => ['gamerooms', 'detail', id] as const,
  },
  chat: {
    conversations: () => ['chat', 'conversations'] as const,
    messages: (conversationId: number) => ['chat', 'messages', conversationId] as const,
    users: (q: string) => ['chat', 'users', q] as const,
    friends: () => ['chat', 'friends'] as const,
    friendRequests: () => ['chat', 'friend-requests'] as const,
  },
};
