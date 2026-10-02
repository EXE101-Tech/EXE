import { z } from 'zod';

export const premiumPaymentIntentSchema = z.object({
  id: z.number(),
  payment_code: z.string(),
  amount: z.number(),
  status: z.string(),
  submitted_at: z.string(),
});
export type PremiumPaymentIntent = z.infer<typeof premiumPaymentIntentSchema>;

export const premiumPaymentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  user_email: z.string(),
  user_name: z.string(),
  payment_code: z.string(),
  amount: z.number(),
  proof_url: z.string().nullable().optional(),
  status: z.string(),
  submitted_at: z.string(),
  reviewed_at: z.string().nullable().optional(),
  review_note: z.string().nullable().optional(),
});
export type PremiumPayment = z.infer<typeof premiumPaymentSchema>;

export interface PremiumPaymentSubmitInput {
  payment_code: string;
  proof_url: string;
}
