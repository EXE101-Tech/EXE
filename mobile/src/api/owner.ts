import apiClient from './client';
import {
  ownerRegistrationResponseSchema,
  ownerScheduleItemSchema,
  ownerVenueResponseSchema,
  type OwnerScheduleBlockInput,
  type OwnerVenueInput,
} from '@/schemas/owner';

export const ownerApi = {
  getStatus: async () => ownerRegistrationResponseSchema.parse(await apiClient.get('/courts/owner/status')),
  register: async () =>
    ownerRegistrationResponseSchema.parse(await apiClient.post('/courts/owner/register', { accepted_terms: true })),
  cancelRegistration: async () =>
    ownerRegistrationResponseSchema.parse(await apiClient.delete('/courts/owner/registration')),

  listVenues: async () => ownerVenueResponseSchema.array().parse(await apiClient.get('/courts/owner/venues')),
  createVenue: async (data: OwnerVenueInput) =>
    ownerVenueResponseSchema.parse(await apiClient.post('/courts/owner/venues', data)),
  updateVenue: async (venueId: number, data: Partial<OwnerVenueInput>) =>
    ownerVenueResponseSchema.parse(await apiClient.put(`/courts/owner/venues/${venueId}`, data)),
  removeVenue: async (venueId: number) =>
    ownerVenueResponseSchema.parse(await apiClient.delete(`/courts/owner/venues/${venueId}`)),

  getSchedule: async (venueId: number, date: string) =>
    ownerScheduleItemSchema
      .array()
      .parse(await apiClient.get(`/courts/owner/venues/${venueId}/schedule`, { params: { date } })),
  createScheduleBlock: async (venueId: number, data: OwnerScheduleBlockInput) =>
    ownerScheduleItemSchema.parse(await apiClient.post(`/courts/owner/venues/${venueId}/schedule/blocks`, data)),
  removeScheduleBlock: async (venueId: number, blockId: number) =>
    apiClient.delete(`/courts/owner/venues/${venueId}/schedule/blocks/${blockId}`),
};
