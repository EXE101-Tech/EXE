import apiClient from './client';
import {
  premiumPaymentIntentSchema,
  premiumPaymentSchema,
  type PremiumPaymentSubmitInput,
} from '@/schemas/premium';

export const premiumApi = {
  createPaymentIntent: async () => premiumPaymentIntentSchema.parse(await apiClient.post('/premium/payments/intents')),
  submitPaymentProof: async (id: number, data: PremiumPaymentSubmitInput) =>
    premiumPaymentSchema.parse(await apiClient.post(`/premium/payments/${id}/submit`, data)),
  getMine: async () => premiumPaymentSchema.array().parse(await apiClient.get('/premium/payments/mine')),
};
