import { z } from 'zod';

export const ownerRegistrationResponseSchema = z.object({
  owner_status: z.string(),
  owned_venues_count: z.number(),
});
export type OwnerRegistrationResponse = z.infer<typeof ownerRegistrationResponseSchema>;

export const ownerVenueResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  owner_id: z.number().nullable().optional(),
  sport_id: z.string().nullable().optional(),
  price_label: z.string().nullable().optional(),
  court_count: z.number(),
  facilities: z.record(z.string(), z.boolean()).default({}),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean(),
});
export type OwnerVenueResponse = z.infer<typeof ownerVenueResponseSchema>;

export interface OwnerVenueInput {
  name: string;
  address: string;
  sport_id: string;
  price_label: string;
  court_count: number;
  facilities: Record<string, boolean>;
  description?: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
}

export const ownerScheduleItemSchema = z.object({
  id: z.number(),
  court_id: z.number(),
  court_name: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  kind: z.string(),
  status: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type OwnerScheduleItem = z.infer<typeof ownerScheduleItemSchema>;

export interface OwnerScheduleBlockInput {
  court_id: number;
  start_time: string;
  end_time: string;
  note?: string;
}
