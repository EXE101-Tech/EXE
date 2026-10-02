// Centralized React Query key factory, grouped to mirror src/api/*.ts modules.
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
    stats: () => ['auth', 'stats'] as const,
  },
  courts: {
    venues: () => ['courts', 'venues'] as const,
    sports: () => ['courts', 'sports'] as const,
    list: <T extends object>(filters?: T) => ['courts', 'list', filters ?? {}] as const,
  },
  admin: {
    summary: () => ['admin', 'summary'] as const,
    payments: (status: string) => ['admin', 'payments', status] as const,
    premiumAccounts: () => ['admin', 'premium-accounts'] as const,
    accounts: () => ['admin', 'accounts'] as const,
    users: () => ['admin', 'users'] as const,
    posts: () => ['admin', 'posts'] as const,
    rooms: () => ['admin', 'rooms'] as const,
    teams: () => ['admin', 'teams'] as const,
  },
  premium: {
    mine: () => ['premium', 'mine'] as const,
  },
  search: {
    results: (q: string) => ['search', 'results', q] as const,
  },
  notifications: {
    list: () => ['notifications', 'list'] as const,
  },
  teams: {
    list: <T extends object>(filters?: T) => ['teams', 'list', filters ?? {}] as const,
    detail: (id: number) => ['teams', 'detail', id] as const,
    members: (id: number, status?: string) => ['teams', 'members', id, status ?? 'all'] as const,
    reviews: (id: number) => ['teams', 'reviews', id] as const,
  },
  gamerooms: {
    list: <T extends object>(filters?: T) => ['gamerooms', 'list', filters ?? {}] as const,
    mine: () => ['gamerooms', 'list', 'mine'] as const,
    detail: (id: number) => ['gamerooms', 'detail', id] as const,
    autoSearch: () => ['gamerooms', 'auto-search'] as const,
  },
  social: {
    feed: () => ['social', 'feed'] as const,
    mine: () => ['social', 'mine'] as const,
    comments: (postId: number) => ['social', 'comments', postId] as const,
  },
  chat: {
    conversations: () => ['chat', 'conversations'] as const,
    unreadCount: () => ['chat', 'unread-count'] as const,
    messages: (conversationId: number) => ['chat', 'messages', conversationId] as const,
    users: (q: string) => ['chat', 'users', q] as const,
    friends: () => ['chat', 'friends'] as const,
    friendRequests: () => ['chat', 'friend-requests'] as const,
  },
};
