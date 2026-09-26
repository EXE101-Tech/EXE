import { z } from 'zod';

export const lfgPostResponseSchema = z.object({
  id: z.number(),
  author_id: z.number(),
  author_name: z.string(),
  author_avatar_url: z.string().nullable().optional(),
  author_owner_status: z.string().default('none'),
  sport_id: z.string(),
  sport_name: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  location: z.string(),
  price_info: z.string().nullable().optional(),
  time_slot: z.string(),
  date_label: z.string(),
  current_members: z.number(),
  total_members: z.number(),
  price: z.string().nullable().optional(),
  skill_level: z.string(),
  image_url: z.string().nullable().optional(),
  status: z.string(),
  has_joined: z.boolean().default(false),
  membership_status: z.string().nullable().optional(),
  pending_participants_count: z.number().default(0),
  approved_participants_count: z.number().default(0),
  created_at: z.string(),
});
export type LfgPostResponse = z.infer<typeof lfgPostResponseSchema>;

export const lfgParticipantResponseSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  user_id: z.number(),
  name: z.string(),
  avatar_url: z.string().nullable().optional(),
  status: z.string(),
  joined_at: z.string(),
});
export type LfgParticipantResponse = z.infer<typeof lfgParticipantResponseSchema>;

export interface LfgPostCreateInput {
  sport_id: string;
  sport_name: string;
  title: string;
  description?: string;
  location: string;
  time_slot: string;
  date_label: string;
  current_members?: number;
  total_members: number;
  price: string;
  skill_level: string;
  image_url?: string;
}

export type LfgPostUpdateInput = Partial<LfgPostCreateInput>;
