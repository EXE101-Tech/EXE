import { z } from 'zod';

const notificationActorSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar_url: z.string().nullable().optional(),
});

export const notificationResponseSchema = z.object({
  id: z.number(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  target_url: z.string().nullable().optional(),
  entity_type: z.string().nullable().optional(),
  entity_id: z.number().nullable().optional(),
  is_read: z.boolean(),
  created_at: z.string(),
  actor: notificationActorSchema.nullable().optional(),
});
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;

export const notificationListResponseSchema = z.object({
  items: z.array(notificationResponseSchema).default([]),
  unread_count: z.number().default(0),
});
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;
