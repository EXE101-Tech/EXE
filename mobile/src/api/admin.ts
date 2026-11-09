import apiClient from './client';
import {
  adminAccountSchema,
  adminAttendanceResultSchema,
  adminDeletionRequestSchema,
  adminMatchSchema,
  adminPremiumAccountSchema,
  adminReportSchema,
  adminSummarySchema,
  adminUserSchema,
  moderationWarningCreateSchema,
  type AdminAccountCreateInput,
  type ModerationWarningCreateInput,
  type PaymentReviewStatus,
  type ReportReviewStatus,
} from '@/schemas/admin';
import { matchResponseSchema } from '@/schemas/gamerooms';
import { premiumPaymentSchema } from '@/schemas/premium';
import { socialPostSchema } from '@/schemas/social';

export type AdminPaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Premium members whose subscription is still running vs. already ended. */
export type PremiumAccountStatus = 'active' | 'expired';

/** Moderation endpoints (`/admin/*`); every call needs an admin token, the server answers 403 otherwise. */
export const adminApi = {
  getSummary: async () => adminSummarySchema.parse(await apiClient.get('/admin/summary')),

  getPosts: async () => socialPostSchema.array().parse(await apiClient.get('/admin/posts')),
  getRooms: async () => matchResponseSchema.array().parse(await apiClient.get('/admin/rooms')),
  /** Rooms verified as having happened, newest first; includes rooms already taken off public view. */
  getOccurredRooms: async () =>
    adminMatchSchema.array().parse(await apiClient.get('/admin/rooms', { params: { occurred_only: true } })),
  getOccurredRoomAttendance: async (roomId: number) =>
    adminAttendanceResultSchema.array().parse(await apiClient.get(`/admin/rooms/${roomId}/attendance`)),

  getPayments: async (status?: AdminPaymentStatus) =>
    premiumPaymentSchema.array().parse(await apiClient.get('/admin/payments', { params: status ? { status } : {} })),
  reviewPayment: async (id: number, status: PaymentReviewStatus, reviewNote?: string) =>
    premiumPaymentSchema.parse(
      await apiClient.patch(`/admin/payments/${id}`, { status, review_note: reviewNote || undefined }),
    ),

  getPremiumAccounts: async (status: PremiumAccountStatus = 'active') =>
    adminPremiumAccountSchema.array().parse(await apiClient.get('/admin/premium/accounts', { params: { status } })),
  revokePremium: async (userId: number) => apiClient.delete(`/admin/premium/accounts/${userId}`),

  getAccounts: async () => adminAccountSchema.array().parse(await apiClient.get('/admin/accounts')),
  createAccount: async (data: AdminAccountCreateInput) =>
    adminAccountSchema.parse(await apiClient.post('/admin/accounts', data)),
  deleteAccount: async (id: number) => apiClient.delete(`/admin/accounts/${id}`),

  getUsers: async () => adminUserSchema.array().parse(await apiClient.get('/admin/users')),
  deleteUser: async (id: number) => apiClient.delete(`/admin/users/${id}`),

  /** Reports waiting for review. */
  getReports: async () =>
    adminReportSchema.array().parse(await apiClient.get('/moderation/admin/reports', { params: { status: 'PENDING' } })),
  /** `RESOLVED` = handled, `DISMISSED` = ignored (the same two actions as the web). */
  reviewReport: async (id: number, status: ReportReviewStatus) =>
    adminReportSchema.parse(
      await apiClient.patch(`/moderation/admin/reports/${id}`, {
        status,
        action: status === 'RESOLVED' ? 'reviewed' : 'dismissed',
      }),
    ),

  /** Account deletion requests waiting for the admin, oldest first. */
  getDeletionRequests: async () =>
    adminDeletionRequestSchema.array().parse(await apiClient.get('/moderation/admin/account-deletion-requests')),
  /** Deletes the account the request names (the server also marks the request done). */
  completeDeletionRequest: async (id: number) =>
    apiClient.post(`/moderation/admin/account-deletion-requests/${id}/complete`),

  sendWarning: async (data: ModerationWarningCreateInput) =>
    apiClient.post('/admin/warnings', moderationWarningCreateSchema.parse(data)),
};
