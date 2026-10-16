import apiClient from './client';
import {
  adminAccountSchema,
  adminPremiumAccountSchema,
  adminSummarySchema,
  adminUserSchema,
  moderationWarningCreateSchema,
  type AdminAccountCreateInput,
  type ModerationWarningCreateInput,
  type PaymentReviewStatus,
} from '@/schemas/admin';
import { matchResponseSchema } from '@/schemas/gamerooms';
import { premiumPaymentSchema } from '@/schemas/premium';
import { socialPostSchema } from '@/schemas/social';

export type AdminPaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Moderation endpoints (`/admin/*`); every call needs an admin token, the server answers 403 otherwise. */
export const adminApi = {
  getSummary: async () => adminSummarySchema.parse(await apiClient.get('/admin/summary')),

  getPosts: async () => socialPostSchema.array().parse(await apiClient.get('/admin/posts')),
  getRooms: async () => matchResponseSchema.array().parse(await apiClient.get('/admin/rooms')),

  getPayments: async (status?: AdminPaymentStatus) =>
    premiumPaymentSchema.array().parse(await apiClient.get('/admin/payments', { params: status ? { status } : {} })),
  reviewPayment: async (id: number, status: PaymentReviewStatus, reviewNote?: string) =>
    premiumPaymentSchema.parse(
      await apiClient.patch(`/admin/payments/${id}`, { status, review_note: reviewNote || undefined }),
    ),

  getPremiumAccounts: async () =>
    adminPremiumAccountSchema.array().parse(await apiClient.get('/admin/premium/accounts')),
  revokePremium: async (userId: number) => apiClient.delete(`/admin/premium/accounts/${userId}`),

  getAccounts: async () => adminAccountSchema.array().parse(await apiClient.get('/admin/accounts')),
  createAccount: async (data: AdminAccountCreateInput) =>
    adminAccountSchema.parse(await apiClient.post('/admin/accounts', data)),
  deleteAccount: async (id: number) => apiClient.delete(`/admin/accounts/${id}`),

  getUsers: async () => adminUserSchema.array().parse(await apiClient.get('/admin/users')),
  deleteUser: async (id: number) => apiClient.delete(`/admin/users/${id}`),

  sendWarning: async (data: ModerationWarningCreateInput) =>
    apiClient.post('/admin/warnings', moderationWarningCreateSchema.parse(data)),
};
