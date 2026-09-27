import apiClient from './client';
import { bookingAvailabilityItemSchema, bookingResponseSchema, type BookingCreateInput } from '@/schemas/bookings';

export const bookingsApi = {
  getAll: async () => bookingResponseSchema.array().parse(await apiClient.get('/bookings')),
  getById: async (id: number) => bookingResponseSchema.parse(await apiClient.get(`/bookings/${id}`)),
  create: async (data: BookingCreateInput) =>
    bookingResponseSchema.parse(await apiClient.post('/bookings', data)),
  createBatch: async (bookings: BookingCreateInput[]) =>
    bookingResponseSchema.array().parse(await apiClient.post('/bookings/batch', { bookings })),
  cancel: async (id: number) => bookingResponseSchema.parse(await apiClient.patch(`/bookings/${id}/cancel`)),
  getAvailability: async (venueId: number, date: string) =>
    bookingAvailabilityItemSchema
      .array()
      .parse(await apiClient.get('/bookings/availability', { params: { venue_id: venueId, date } })),
};
