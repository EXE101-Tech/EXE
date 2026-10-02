import { z } from 'zod';

export const socialPostSchema = z.object({
  id: z.number(),
  author_id: z.number(),
  author_name: z.string(),
  author_avatar_url: z.string().nullable().optional(),
  author_owner_status: z.string().default('none'),
  author_is_premium: z.boolean().default(false),
  friendship_status: z.string().default('none'),
  friendship_id: z.number().nullable().optional(),
  content: z.string().nullable().optional(),
  media_url: z.string().nullable().optional(),
  media_type: z.enum(['image', 'video']).nullable().optional(),
  like_count: z.number().default(0),
  comment_count: z.number().default(0),
  liked_by_me: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SocialPost = z.infer<typeof socialPostSchema>;

export const socialLikeSchema = z.object({
  liked: z.boolean(),
  like_count: z.number(),
});

export const socialCommentSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  author_id: z.number(),
  parent_id: z.number().nullable().optional(),
  author_name: z.string(),
  author_avatar_url: z.string().nullable().optional(),
  content: z.string(),
  created_at: z.string(),
  reply_count: z.number().default(0),
  reaction_counts: z.record(z.string(), z.number()).default({}),
  my_reaction: z.string().nullable().optional(),
});
export type SocialComment = z.infer<typeof socialCommentSchema>;

export const commentReactionResultSchema = z.object({
  comment_id: z.number(),
  reaction_counts: z.record(z.string(), z.number()).default({}),
  my_reaction: z.string().nullable().optional(),
});

export interface SocialPostInput {
  content?: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
}

export const COMMENT_REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Thích' },
  { key: 'love', emoji: '❤️', label: 'Yêu thích' },
  { key: 'laugh', emoji: '😂', label: 'Haha' },
  { key: 'wow', emoji: '😮', label: 'Wow' },
  { key: 'sad', emoji: '😢', label: 'Buồn' },
  { key: 'angry', emoji: '😡', label: 'Phẫn nộ' },
] as const;
