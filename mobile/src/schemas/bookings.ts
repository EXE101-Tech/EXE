import { z } from 'zod';
import { courtResponseSchema } from './courts';

export const bookingResponseSchema = z.object({
  id: z.number(),
  court_id: z.number(),
  user_id: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  total_price: z.number(),
  status: z.string(),
  created_at: z.string(),
  court: courtResponseSchema,
});
export type BookingResponse = z.infer<typeof bookingResponseSchema>;

export const bookingAvailabilityItemSchema = z.object({
  court_id: z.number(),
  start_time: z.string(),
  end_time: z.string(),
});
export type BookingAvailabilityItem = z.infer<typeof bookingAvailabilityItemSchema>;

export interface BookingCreateInput {
  court_id: number;
  start_time: string;
  end_time: string;
}
