import apiClient from './client';
import {
  lfgParticipantResponseSchema,
  lfgPostResponseSchema,
  type LfgPostCreateInput,
  type LfgPostUpdateInput,
} from '@/schemas/lfg';

export interface LfgFilters {
  sport_id?: string;
  skill_level?: string;
  q?: string;
}

export const lfgApi = {
  getAll: async (filters: LfgFilters = {}) =>
    lfgPostResponseSchema.array().parse(await apiClient.get('/lfg/posts', { params: filters })),
  getById: async (id: number) => lfgPostResponseSchema.parse(await apiClient.get(`/lfg/posts/${id}`)),
  create: async (data: LfgPostCreateInput) =>
    lfgPostResponseSchema.parse(await apiClient.post('/lfg/posts', data)),
  update: async (id: number, data: LfgPostUpdateInput) =>
    lfgPostResponseSchema.parse(await apiClient.put(`/lfg/posts/${id}`, data)),
  join: async (id: number) => lfgPostResponseSchema.parse(await apiClient.post(`/lfg/posts/${id}/join`)),
  leave: async (id: number) => lfgPostResponseSchema.parse(await apiClient.delete(`/lfg/posts/${id}/membership`)),
  cancel: async (id: number) => apiClient.delete(`/lfg/posts/${id}`),
  getParticipants: async (id: number, status = 'PENDING') =>
    lfgParticipantResponseSchema.array().parse(await apiClient.get(`/lfg/posts/${id}/participants`, { params: { status } })),
  setParticipantStatus: async (id: number, userId: number, status: 'APPROVED' | 'REJECTED') =>
    lfgParticipantResponseSchema.parse(await apiClient.patch(`/lfg/posts/${id}/participants/${userId}`, { status })),
};
