import { Text } from '@/components/ui/text';
import { BellRing, ReceiptText } from 'lucide-react-native';
import { View } from 'react-native';

import { PostMedia } from '@/components/social/post-media';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMyPaymentsQuery } from '@/hooks/queries/use-premium';
import { formatDateVi, formatTimeVi } from '@/lib/slots';
import type { PremiumPayment } from '@/schemas/premium';

type PaymentState = 'unsent' | 'pending' | 'approved' | 'rejected';

/** A transaction is "unsent" while the transfer code exists but no proof image has been submitted yet. */
function stateOf(payment: PremiumPayment): PaymentState {
  if (payment.status === 'APPROVED') return 'approved';
  if (payment.status === 'REJECTED') return 'rejected';
  return payment.proof_url ? 'pending' : 'unsent';
}

const STATE_META: Record<PaymentState, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  unsent: { label: 'Chưa gửi chứng từ', variant: 'warning' },
  pending: { label: 'Chờ duyệt', variant: 'default' },
  approved: { label: 'Đã duyệt', variant: 'success' },
  rejected: { label: 'Bị từ chối', variant: 'danger' },
};

const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;
const formatDateTime = (value: string) => `${formatDateVi(value)} · ${formatTimeVi(value)}`;

interface PaymentHistoryProps {
  /** Reopens the payment popup, which reuses the unsent transfer code instead of creating a new one. */
  onContinue: () => void;
}

/**
 * "Lịch sử giao dịch" on the Premium screen (the server keeps every transaction; this lets the member follow
 * them). An unsent transaction is shown first as a reminder to finish paying.
 */
export function PaymentHistory({ onContinue }: PaymentHistoryProps) {
  const { data: payments } = useMyPaymentsQuery();
  if (!payments || payments.length === 0) return null;

  const unsent = payments.find((payment) => stateOf(payment) === 'unsent');

  return (
    <View className="mt-8 gap-3">
      <View className="flex-row items-center gap-2">
        <ReceiptText size={16} color="#537fff" />
        <Text className="text-base font-black text-slate-900 dark:text-white">Lịch sử giao dịch</Text>
      </View>

      {unsent ? (
        <View className="gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <View className="flex-row items-start gap-3">
            <BellRing size={18} color="#D97706" />
            <View className="flex-1 gap-1">
              <Text className="text-sm font-black text-amber-700 dark:text-amber-300">Bạn chưa hoàn tất thanh toán</Text>
              <Text className="text-xs leading-5 text-amber-700 dark:text-amber-300">
                Mã <Text className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300">{unsent.payment_code}</Text>{' '}
                đã được tạo nhưng chưa có ảnh chuyển khoản. Hãy chuyển khoản và gửi ảnh để quản trị viên kiểm tra.
              </Text>
            </View>
          </View>
          <Button size="sm" label="Hoàn tất thanh toán" onPress={onContinue} className="self-start bg-amber-600 dark:bg-amber-600" />
        </View>
      ) : null}

      {payments.map((payment) => {
        const state = stateOf(payment);
        const meta = STATE_META[state];
        return (
          <View
            key={payment.id}
            className="gap-2 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-[#111827]"
          >
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 gap-0.5">
                <Text className="font-mono text-sm font-bold text-slate-900 dark:text-white" selectable>
                  {payment.payment_code}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDateTime(payment.submitted_at)} · {formatVnd(payment.amount)}
                </Text>
              </View>
              <Badge variant={meta.variant} label={meta.label} />
            </View>

            {state === 'pending' ? (
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Đã gửi ảnh chuyển khoản, đang chờ quản trị viên kiểm tra.
              </Text>
            ) : null}
            {state === 'approved' ? (
              <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Premium đã được kích hoạt{payment.reviewed_at ? ` lúc ${formatDateTime(payment.reviewed_at)}` : ''}.
              </Text>
            ) : null}
            {state === 'rejected' ? (
              <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Giao dịch chưa được duyệt{payment.review_note ? `: ${payment.review_note}` : '.'}
              </Text>
            ) : null}

            {payment.proof_url ? (
              <View className="overflow-hidden rounded-xl border border-border dark:border-border-dark">
                <PostMedia url={payment.proof_url} type="image" label="Ảnh chuyển khoản" height={130} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
