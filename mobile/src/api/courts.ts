import apiClient from './client';
import { courtResponseSchema, venueResponseSchema } from '@/schemas/courts';
import { sportCatalogItemSchema } from '@/schemas/common';

export const courtsApi = {
  getVenues: async () => venueResponseSchema.array().parse(await apiClient.get('/courts/venues')),
  getSports: async () => sportCatalogItemSchema.array().parse(await apiClient.get('/courts/sports')),
  getAll: async (filters: { venue_id?: number; sport_id?: number } = {}) =>
    courtResponseSchema.array().parse(await apiClient.get('/courts', { params: filters })),
};
