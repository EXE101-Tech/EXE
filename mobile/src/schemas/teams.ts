import { z } from 'zod';

export const teamResponseSchema = z.object({
  id: z.number(),
  owner_id: z.number().nullable().optional(),
  owner_name: z.string(),
  name: z.string(),
  sport_id: z.string(),
  sport_name: z.string(),
  description: z.string().nullable().optional(),
  location: z.string(),
  total_slots: z.number(),
  member_count: z.number(),
  rating: z.number(),
  rating_count: z.number(),
  image_url: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  membership_status: z.string().nullable().optional(),
  is_captain: z.boolean().default(false),
  is_member: z.boolean().default(false),
  created_at: z.string(),
});
export type TeamResponse = z.infer<typeof teamResponseSchema>;

export const teamMemberResponseSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  user_id: z.number(),
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  status: z.string(),
  joined_at: z.string(),
});
export type TeamMemberResponse = z.infer<typeof teamMemberResponseSchema>;

export const teamReviewResponseSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  user_id: z.number(),
  rating: z.number(),
  comment: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  created_at: z.string(),
});
export type TeamReviewResponse = z.infer<typeof teamReviewResponseSchema>;

export interface TeamCreateInput {
  name: string;
  sport_id: string;
  sport_name: string;
  description?: string;
  location: string;
  total_slots?: number;
  image_url?: string;
  tags?: string[];
}

export type TeamUpdateInput = Partial<TeamCreateInput>;

export interface TeamReviewCreateInput {
  rating: number;
  comment?: string;
  tags?: string[];
}
