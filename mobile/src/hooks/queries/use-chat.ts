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

export function useMessagesQuery(conversationId: number) {
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: () => chatApi.getMessages(conversationId),
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
