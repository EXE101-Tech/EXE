import apiClient from './client';

export const moderationApi = {
  report: (data: { target_type: 'post' | 'comment' | 'user' | 'message'; target_id: number; reason: string; details?: string }) =>
    apiClient.post('/moderation/reports', data),
  block: (userId: number) => apiClient.post(`/moderation/blocks/${userId}`),
  unblock: (userId: number) => apiClient.delete(`/moderation/blocks/${userId}`),
};
