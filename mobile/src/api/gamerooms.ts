import apiClient from './client';
import {
  matchParticipantResponseSchema,
  matchResponseSchema,
  type MatchCreateInput,
} from '@/schemas/gamerooms';

export interface GameroomFilters {
  sport_id?: number;
  status?: string;
}

export const gameroomsApi = {
  getAll: async (filters: GameroomFilters = {}) =>
    matchResponseSchema.array().parse(await apiClient.get('/gamerooms', { params: filters })),
  getById: async (id: number) => matchResponseSchema.parse(await apiClient.get(`/gamerooms/${id}`)),
  create: async (data: MatchCreateInput) => matchResponseSchema.parse(await apiClient.post('/gamerooms', data)),
  join: async (id: number, note = '') =>
    matchParticipantResponseSchema.parse(await apiClient.post(`/gamerooms/${id}/join`, { note })),
  leave: async (id: number) => apiClient.post(`/gamerooms/${id}/leave`),
  setParticipantStatus: async (id: number, userId: number, status: 'APPROVED' | 'REJECTED') =>
    matchParticipantResponseSchema.parse(
      await apiClient.patch(`/gamerooms/${id}/participants/${userId}/status`, { status }),
    ),
};
