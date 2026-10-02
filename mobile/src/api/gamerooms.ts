import apiClient from './client';
import {
  matchParticipantResponseSchema,
  matchResponseSchema,
  roomSearchPreferenceSchema,
  type MatchAttendanceStatus,
  type MatchCreateInput,
  type RoomSearchPreferenceInput,
} from '@/schemas/gamerooms';

export interface GameroomFilters {
  sport_id?: number;
  status?: string;
}

export const gameroomsApi = {
  getAll: async (filters: GameroomFilters = {}) =>
    matchResponseSchema.array().parse(await apiClient.get('/gamerooms', { params: filters })),
  getMine: async () => matchResponseSchema.array().parse(await apiClient.get('/gamerooms/mine')),
  getById: async (id: number) => matchResponseSchema.parse(await apiClient.get(`/gamerooms/${id}`)),
  create: async (data: MatchCreateInput) => matchResponseSchema.parse(await apiClient.post('/gamerooms', data)),
  update: async (id: number, data: MatchCreateInput) =>
    matchResponseSchema.parse(await apiClient.put(`/gamerooms/${id}`, data)),
  remove: async (id: number) => apiClient.delete(`/gamerooms/${id}`),
  join: async (id: number, note = '') =>
    matchParticipantResponseSchema.parse(await apiClient.post(`/gamerooms/${id}/join`, { note })),
  respondInvite: async (id: number, action: 'ACCEPT' | 'REJECT') =>
    matchParticipantResponseSchema.parse(await apiClient.post(`/gamerooms/${id}/invite-response`, { action })),
  leave: async (id: number) => apiClient.post(`/gamerooms/${id}/leave`),
  setParticipantStatus: async (id: number, userId: number, status: 'APPROVED' | 'REJECTED') =>
    matchParticipantResponseSchema.parse(
      await apiClient.patch(`/gamerooms/${id}/participants/${userId}/status`, { status }),
    ),
  updateAttendance: async (id: number, userId: number, attendanceStatus: MatchAttendanceStatus) =>
    matchParticipantResponseSchema.parse(
      await apiClient.patch(`/gamerooms/${id}/participants/${userId}/attendance`, {
        attendance_status: attendanceStatus,
      }),
    ),
  getAutoSearch: async () =>
    roomSearchPreferenceSchema.nullable().parse(await apiClient.get('/gamerooms/auto-search')),
  saveAutoSearch: async (data: RoomSearchPreferenceInput) =>
    roomSearchPreferenceSchema.parse(await apiClient.put('/gamerooms/auto-search', data)),
  removeAutoSearch: async () => apiClient.delete('/gamerooms/auto-search'),
};
