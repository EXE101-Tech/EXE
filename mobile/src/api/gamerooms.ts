import apiClient from './client';
import type { InviteConsent, JoinConsent } from '@/lib/seat-holds';
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
  join: async (id: number, note = '', consent?: JoinConsent) =>
    matchParticipantResponseSchema.parse(await apiClient.post(`/gamerooms/${id}/join`, { note, ...consent })),
  /** Standby list of a seat-hold room that has no free seat; the host invites standby players when a seat opens. */
  joinWaitlist: async (id: number, note = '', consent?: JoinConsent) =>
    matchParticipantResponseSchema.parse(await apiClient.post(`/gamerooms/${id}/waitlist`, { note, ...consent })),
  respondInvite: async (id: number, action: 'ACCEPT' | 'REJECT', consent?: InviteConsent) =>
    matchParticipantResponseSchema.parse(
      await apiClient.post(`/gamerooms/${id}/invite-response`, { action, ...consent }),
    ),
  /** Confirms the player's seat in a seat-hold room (clears the hold deadline). */
  confirmSeat: async (id: number, termsVersion: string) =>
    apiClient.post(`/gamerooms/${id}/attendance/confirm`, { accepted_policy: true, terms_version: termsVersion }),
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
