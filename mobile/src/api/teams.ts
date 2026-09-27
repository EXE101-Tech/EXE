import apiClient from './client';
import {
  teamMemberResponseSchema,
  teamResponseSchema,
  teamReviewResponseSchema,
  type TeamCreateInput,
  type TeamReviewCreateInput,
  type TeamUpdateInput,
} from '@/schemas/teams';

export interface TeamFilters {
  sport_id?: string;
  q?: string;
}

export const teamsApi = {
  getAll: async (filters: TeamFilters = {}) =>
    teamResponseSchema.array().parse(await apiClient.get('/teams', { params: filters })),
  getById: async (id: number) => teamResponseSchema.parse(await apiClient.get(`/teams/${id}`)),
  create: async (data: TeamCreateInput) => teamResponseSchema.parse(await apiClient.post('/teams', data)),
  update: async (id: number, data: TeamUpdateInput) =>
    teamResponseSchema.parse(await apiClient.patch(`/teams/${id}`, data)),
  remove: async (id: number) => apiClient.delete(`/teams/${id}`),
  join: async (id: number) => teamMemberResponseSchema.parse(await apiClient.post(`/teams/${id}/join`)),
  leave: async (id: number) => apiClient.delete(`/teams/${id}/membership`),
  getMembers: async (id: number, status?: string) =>
    teamMemberResponseSchema.array().parse(await apiClient.get(`/teams/${id}/members`, { params: status ? { status } : {} })),
  setMemberStatus: async (id: number, userId: number, status: 'APPROVED' | 'REJECTED') =>
    teamMemberResponseSchema.parse(await apiClient.patch(`/teams/${id}/members/${userId}`, { status })),
  getReviews: async (id: number) =>
    teamReviewResponseSchema.array().parse(await apiClient.get(`/teams/${id}/reviews`)),
  review: async (id: number, data: TeamReviewCreateInput) =>
    teamReviewResponseSchema.parse(await apiClient.post(`/teams/${id}/reviews`, data)),
};
