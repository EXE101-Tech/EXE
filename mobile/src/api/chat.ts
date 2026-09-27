import apiClient from './client';
import {
  chatConversationDetailResponseSchema,
  chatConversationResponseSchema,
  chatMessageResponseSchema,
  chatUserSearchResponseSchema,
  friendshipResponseSchema,
} from '@/schemas/chat';

export const chatApi = {
  getConversations: async () =>
    chatConversationResponseSchema.array().parse(await apiClient.get('/chat/conversations')),
  getUnreadCount: async () => apiClient.get<{ unread_count: number }, { unread_count: number }>('/chat/unread-count'),
  startConversation: async (recipientId: number) =>
    chatConversationResponseSchema.parse(await apiClient.post('/chat/conversations', { recipient_id: recipientId })),
  getMessages: async (conversationId: number) =>
    chatConversationDetailResponseSchema.parse(await apiClient.get(`/chat/conversations/${conversationId}/messages`)),
  sendMessage: async (conversationId: number, text: string) =>
    chatMessageResponseSchema.parse(await apiClient.post(`/chat/conversations/${conversationId}/messages`, { text })),
  searchUsers: async (q: string) =>
    chatUserSearchResponseSchema.array().parse(await apiClient.get('/chat/users', { params: { q, limit: 30 } })),
  getFriends: async () => friendshipResponseSchema.array().parse(await apiClient.get('/chat/friends')),
  getFriendRequests: async () =>
    friendshipResponseSchema.array().parse(await apiClient.get('/chat/friends/requests')),
  sendFriendRequest: async (userId: number) =>
    friendshipResponseSchema.parse(await apiClient.post('/chat/friends/requests', { recipient_id: userId })),
  acceptFriendRequest: async (friendshipId: number) =>
    friendshipResponseSchema.parse(await apiClient.post(`/chat/friends/requests/${friendshipId}/accept`)),
  removeFriendship: async (friendshipId: number) => apiClient.delete(`/chat/friends/${friendshipId}`),
};
