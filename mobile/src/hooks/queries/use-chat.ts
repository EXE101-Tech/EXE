import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '@/api/chat';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

export function useConversationsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: chatApi.getConversations,
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 12000 : false,
  });
}

/** Total unread messages for the chat tab badge; refreshed every 12s like the web navbar. */
export function useChatUnreadCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    queryKey: queryKeys.chat.unreadCount(),
    queryFn: chatApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 12000 : false,
  });
  return data?.unread_count ?? 0;
}

export function useMessagesQuery(conversationId: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: async () => {
      const detail = await chatApi.getMessages(conversationId);
      // Fetching a thread marks it read on the server, so the tab badge has to catch up.
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadCount() });
      return detail;
    },
    enabled: Number.isFinite(conversationId),
    refetchInterval: Number.isFinite(conversationId) ? 5000 : false,
  });
}

export function useStartConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipientId: number) => chatApi.startConversation(recipientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
  });
}

export function useSendMessageMutation(conversationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => chatApi.sendMessage(conversationId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
  });
}

export function useSearchChatUsersQuery(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.chat.users(trimmed),
    queryFn: () => chatApi.searchUsers(trimmed),
    enabled: trimmed.length >= 2,
  });
}

export function useFriendsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.chat.friends(),
    queryFn: chatApi.getFriends,
    enabled: isAuthenticated,
  });
}

export function useFriendRequestsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.chat.friendRequests(),
    queryFn: chatApi.getFriendRequests,
    enabled: isAuthenticated,
  });
}

function useInvalidateFriendLists() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.friends() });
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests() });
    queryClient.invalidateQueries({ queryKey: ['chat', 'users'] });
    // The thread header shows the friendship state, which these actions change.
    queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
  };
}

export function useSendFriendRequestMutation() {
  const invalidate = useInvalidateFriendLists();
  return useMutation({
    mutationFn: (userId: number) => chatApi.sendFriendRequest(userId),
    onSuccess: invalidate,
  });
}

export function useAcceptFriendRequestMutation() {
  const invalidate = useInvalidateFriendLists();
  return useMutation({
    mutationFn: (friendshipId: number) => chatApi.acceptFriendRequest(friendshipId),
    onSuccess: invalidate,
  });
}

export function useRemoveFriendshipMutation() {
  const invalidate = useInvalidateFriendLists();
  return useMutation({
    mutationFn: (friendshipId: number) => chatApi.removeFriendship(friendshipId),
    onSuccess: invalidate,
  });
}
