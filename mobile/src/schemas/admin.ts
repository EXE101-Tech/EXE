import { z } from 'zod';

import { userProfileResponseSchema } from './auth';
import { matchResponseSchema } from './gamerooms';

export const adminSummarySchema = z.object({
  users: z.number().default(0),
  posts: z.number().default(0),
  teams: z.number().default(0),
  rooms: z.number().default(0),
  /** Rooms whose game was verified as having happened (host + peer evidence), not just rooms that ended. */
  rooms_occurred: z.number().default(0),
  pending_payments: z.number().default(0),
  /** Approved Premium payments and the money they add up to (VND). */
  premium_subscriptions: z.number().default(0),
  premium_revenue: z.number().default(0),
  /** Premium members whose subscription has not run out yet. */
  premium_active: z.number().default(0),
});
export type AdminSummary = z.infer<typeof adminSummarySchema>;

/** A room as the admin list sees it: `removed` marks a past room taken off public view whose history is kept. */
export const adminMatchSchema = matchResponseSchema.extend({
  removed: z.boolean().default(false),
});
export type AdminMatch = z.infer<typeof adminMatchSchema>;

export const adminAttendanceOutcomeSchema = z.enum(['ATTENDED', 'NO_SHOW', 'UNVERIFIED']).catch('UNVERIFIED');
export type AdminAttendanceOutcome = z.infer<typeof adminAttendanceOutcomeSchema>;

/** Verified attendance result of one player in an occurred room. */
export const adminAttendanceResultSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  is_host: z.boolean().default(false),
  outcome: adminAttendanceOutcomeSchema,
});
export type AdminAttendanceResult = z.infer<typeof adminAttendanceResultSchema>;

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

/** A member's report of a post, comment, user or message, waiting for an admin (web: "Báo cáo"). */
export const adminReportSchema = z.object({
  id: z.number(),
  reporter_id: z.number(),
  target_type: z.string(),
  target_id: z.number(),
  reason: z.string(),
  details: z.string().nullable().optional(),
  status: z.string(),
  reviewed_at: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  created_at: z.string(),
});
export type AdminReport = z.infer<typeof adminReportSchema>;

export type ReportReviewStatus = 'RESOLVED' | 'DISMISSED';

/** A request to delete an account, made from the website; the admin deletes it after verifying who asked. */
export const adminDeletionRequestSchema = z.object({
  id: z.number(),
  email: z.string(),
  user_id: z.number().nullable().optional(),
  reason: z.string().nullable().optional(),
  status: z.string(),
  created_at: z.string(),
});
export type AdminDeletionRequest = z.infer<typeof adminDeletionRequestSchema>;

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
