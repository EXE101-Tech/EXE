import { z } from 'zod';

export const chatUserResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar_url: z.string().nullable().optional(),
});
export type ChatUserResponse = z.infer<typeof chatUserResponseSchema>;

export const chatUserSearchResponseSchema = chatUserResponseSchema.extend({
  friendship_status: z.string().default('none'),
  friendship_id: z.number().nullable().optional(),
});
export type ChatUserSearchResponse = z.infer<typeof chatUserSearchResponseSchema>;

export const friendshipResponseSchema = z.object({
  id: z.number(),
  requester_id: z.number(),
  status: z.string(),
  user: chatUserResponseSchema,
  created_at: z.string(),
});
export type FriendshipResponse = z.infer<typeof friendshipResponseSchema>;

export const chatMessageResponseSchema = z.object({
  id: z.number(),
  conversation_id: z.number(),
  sender_id: z.number(),
  text: z.string(),
  created_at: z.string(),
  is_read: z.boolean(),
});
export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>;

export const chatConversationResponseSchema = z.object({
  id: z.number(),
  other_user: chatUserResponseSchema,
  last_message: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  unread_count: z.number().default(0),
});
export type ChatConversationResponse = z.infer<typeof chatConversationResponseSchema>;

export const chatConversationDetailResponseSchema = chatConversationResponseSchema.extend({
  messages: z.array(chatMessageResponseSchema).default([]),
});
export type ChatConversationDetailResponse = z.infer<typeof chatConversationDetailResponseSchema>;
