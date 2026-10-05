import apiClient from './client';
import { notificationListResponseSchema, notificationResponseSchema } from '@/schemas/notifications';

export const notificationsApi = {
  list: async () => notificationListResponseSchema.parse(await apiClient.get('/notifications')),
  markRead: async (id: number) =>
    notificationResponseSchema.parse(await apiClient.patch(`/notifications/${id}/read`)),
  markAllRead: async () => apiClient.post('/notifications/read-all'),
};
