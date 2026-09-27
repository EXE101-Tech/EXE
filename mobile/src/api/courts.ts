import apiClient from './client';
import { courtResponseSchema, venueResponseSchema } from '@/schemas/courts';
import { sportCatalogItemSchema } from '@/schemas/common';

export const courtsApi = {
  getVenues: async () => venueResponseSchema.array().parse(await apiClient.get('/courts/venues')),
  getVenueById: async (id: number) => venueResponseSchema.parse(await apiClient.get(`/courts/venues/${id}`)),
  getSports: async () => sportCatalogItemSchema.array().parse(await apiClient.get('/courts/sports')),
  getAll: async (filters: { venue_id?: number; sport_id?: number } = {}) =>
    courtResponseSchema.array().parse(await apiClient.get('/courts', { params: filters })),
  getById: async (id: number) => courtResponseSchema.parse(await apiClient.get(`/courts/${id}`)),
  getNearby: async (lat: number, lng: number, radius = 5) =>
    venueResponseSchema.array().parse(await apiClient.get('/courts/nearby', { params: { lat, lng, radius } })),
};
