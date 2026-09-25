import apiClient from './client';
import { venueResponseSchema } from '@/schemas/courts';

export const courtsApi = {
  getVenues: async () => venueResponseSchema.array().parse(await apiClient.get('/courts/venues')),
  getVenueById: async (id: number) => venueResponseSchema.parse(await apiClient.get(`/courts/venues/${id}`)),
};
