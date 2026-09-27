import { z } from 'zod';

import { userResponseSchema } from './auth';
import { sportResponseSchema } from './common';
import { courtResponseSchema } from './courts';

export const matchParticipantResponseSchema = z.object({
  id: z.number(),
  match_id: z.number(),
  user_id: z.number(),
  role: z.string(),
  status: z.string(),
  note: z.string().nullable().optional(),
  joined_at: z.string(),
  user: userResponseSchema,
});
export type MatchParticipantResponse = z.infer<typeof matchParticipantResponseSchema>;

export const matchResponseSchema = z.object({
  id: z.number(),
  host_id: z.number(),
  sport_id: z.number(),
  court_id: z.number().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  price_info: z.string().nullable().optional(),
  required_level: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  max_players: z.number(),
  status: z.string(),
  created_at: z.string(),
  host: userResponseSchema,
  sport: sportResponseSchema,
  court: courtResponseSchema.nullable().optional(),
  participants: z.array(matchParticipantResponseSchema).default([]),
});
export type MatchResponse = z.infer<typeof matchResponseSchema>;

export interface MatchCreateInput {
  title: string;
  description?: string;
  location?: string;
  price_info: string;
  sport_id: number;
  court_id?: number;
  required_level: string;
  start_time: string;
  end_time: string;
  max_players: number;
}
