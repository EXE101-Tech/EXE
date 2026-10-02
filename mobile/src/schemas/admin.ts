import { z } from 'zod';

import { userProfileResponseSchema } from './auth';

export const adminSummarySchema = z.object({
  users: z.number().default(0),
  posts: z.number().default(0),
  teams: z.number().default(0),
  rooms: z.number().default(0),
  pending_payments: z.number().default(0),
});
export type AdminSummary = z.infer<typeof adminSummarySchema>;

export const adminAccountSchema = z.object({
  id: z.number(),
  email: z.string(),
  status: z.string(),
  is_admin: z.boolean().default(true),
  created_at: z.string(),
  profile: userProfileResponseSchema.nullable().optional(),
});
export type AdminAccount = z.infer<typeof adminAccountSchema>;

export const adminUserSchema = adminAccountSchema.extend({
  premium_until: z.string().nullable().optional(),
  is_premium: z.boolean().default(false),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const adminPremiumAccountSchema = z.object({
  user_id: z.number(),
  user_email: z.string(),
  user_name: z.string(),
  premium_until: z.string(),
  last_payment_code: z.string().nullable().optional(),
  last_payment_amount: z.number().nullable().optional(),
  last_payment_submitted_at: z.string().nullable().optional(),
  last_payment_proof_url: z.string().nullable().optional(),
  last_payment_reviewed_at: z.string().nullable().optional(),
});
export type AdminPremiumAccount = z.infer<typeof adminPremiumAccountSchema>;

export const adminAccountCreateSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(160),
  email: z.string().trim().email('Email không hợp lệ').max(255),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(128),
});
export type AdminAccountCreateInput = z.infer<typeof adminAccountCreateSchema>;

export type PaymentReviewStatus = 'APPROVED' | 'REJECTED';

export type ModerationTargetType = 'team' | 'game_room';

export const moderationWarningCreateSchema = z.object({
  target_type: z.enum(['team', 'game_room']),
  target_id: z.number().int().positive(),
  message: z.string().trim().min(1, 'Vui lòng nhập nội dung cảnh báo').max(1000),
});
export type ModerationWarningCreateInput = z.infer<typeof moderationWarningCreateSchema>;
