import { z } from 'zod';
import { sportResponseSchema } from './common';

export const venueMinResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type VenueMinResponse = z.infer<typeof venueMinResponseSchema>;

export const courtResponseSchema = z.object({
  id: z.number(),
  venue_id: z.number(),
  name: z.string(),
  sport_id: z.number(),
  price_per_hour: z.number(),
  sport: sportResponseSchema,
  venue: venueMinResponseSchema,
});
export type CourtResponse = z.infer<typeof courtResponseSchema>;

export const venueResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  owner_id: z.number().nullable().optional(),
  owner_name: z.string().nullable().optional(),
  sport_key: z.string().nullable().optional(),
  price_label: z.string().nullable().optional(),
  court_count: z.number().default(0),
  facilities: z.record(z.string(), z.boolean()).default({}),
  image_url: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  review_count: z.number().default(0),
  courts: z.array(courtResponseSchema).default([]),
});
export type VenueResponse = z.infer<typeof venueResponseSchema>;
