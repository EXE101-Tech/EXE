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
  attendance_status: z.string().nullable().optional(),
  invite_source: z.string().nullable().optional(),
  invited_at: z.string().nullable().optional(),
  invite_round: z.number().nullable().optional(),
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
  is_priority: z.boolean().default(false),
  created_at: z.string(),
  host: userResponseSchema,
  sport: sportResponseSchema,
  court: courtResponseSchema.nullable().optional(),
  participants: z.array(matchParticipantResponseSchema).default([]),
});
export type MatchResponse = z.infer<typeof matchResponseSchema>;

export const roomSearchPreferenceSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  sport_id: z.number().nullable().optional(),
  required_level: z.string().nullable().optional(),
  max_price: z.number().nullable().optional(),
  location: z.string().nullable().optional(),
  time_slots: z.array(z.object({ weekday: z.number(), time: z.string() })).default([]),
  is_active: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RoomSearchPreference = z.infer<typeof roomSearchPreferenceSchema>;

export interface RoomSearchPreferenceInput {
  sport_id: number | null;
  required_level: string | null;
  max_price: number | null;
  location: string | null;
  time_slots: { weekday: number; time: string }[];
  is_active: boolean;
}

export type MatchAttendanceStatus = 'ATTENDED' | 'ABSENT';

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
