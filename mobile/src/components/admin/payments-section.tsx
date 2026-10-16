import { Text } from '@/components/ui/text';
import { CheckCircle2, Clock3, History } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { PostMedia } from '@/components/social/post-media';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useProcessedPaymentsQuery,
  usePendingPaymentsQuery,
  usePremiumAccountsQuery,
  useReviewPaymentMutation,
  useRevokePremiumMutation,
  type ProcessedPaymentFilter,
} from '@/hooks/queries/use-admin';
import type { AdminPremiumAccount } from '@/schemas/admin';
import type { PremiumPayment } from '@/schemas/premium';
import {
  AdminRow,
  Segmented,
  SectionHeading,
  ShowMoreButton,
  confirmAction,
  formatDateTimeVi,
  showError,
  useShowMore,
} from './admin-ui';

type PaymentView = 'pending' | 'processed' | 'active';

const formatVnd = (amount?: number | null) => `${(amount ?? 0).toLocaleString('vi-VN')}đ`;

export function PaymentsSection({ notify }: { notify: (message: string) => void }) {
  const [view, setView] = useState<PaymentView>('pending');
  const pending = usePendingPaymentsQuery();
  const active = usePremiumAccountsQuery();

  return (
    <View className="gap-4">
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'pending', label: 'Chờ duyệt', icon: Clock3, count: pending.data?.length },
          { value: 'processed', label: 'Đã xử lý', icon: History },
          { value: 'active', label: 'Kích hoạt', icon: CheckCircle2, count: active.data?.length },
        ]}
      />
      {view === 'pending' ? <PendingPayments query={pending} notify={notify} /> : null}
      {view === 'processed' ? <ProcessedPayments /> : null}
      {view === 'active' ? <ActiveAccounts query={active} notify={notify} /> : null}
    </View>
  );
}

function PendingPayments({
  query,
  notify,
}: {
  query: ReturnType<typeof usePendingPaymentsQuery>;
  notify: (message: string) => void;
}) {
  const review = useReviewPaymentMutation();
  const { visible, remaining, showMore } = useShowMore(query.data ?? []);

  const handleReview = (payment: PremiumPayment, status: 'APPROVED' | 'REJECTED') =>
    review.mutate(
      { id: payment.id, status },
      {
        onSuccess: () => notify(status === 'APPROVED' ? 'Đã duyệt và kích hoạt Premium.' : 'Đã từ chối giao dịch.'),
        onError: (error) => showError(error, 'Không thể cập nhật giao dịch.'),
      },
    );

  const askReview = (payment: PremiumPayment, status: 'APPROVED' | 'REJECTED') =>
    confirmAction({
      title: status === 'APPROVED' ? 'Duyệt giao dịch' : 'Từ chối giao dịch',
      message:
        status === 'APPROVED'
          ? `Kích hoạt Premium 30 ngày cho ${payment.user_name}?`
          : `Từ chối giao dịch ${payment.payment_code} của ${payment.user_name}?`,
      confirmLabel: status === 'APPROVED' ? 'Duyệt' : 'Từ chối',
      onConfirm: () => handleReview(payment, status),
    });

  return (
    <View className="gap-3">
      <SectionHeading icon={Clock3} iconColor="#F59E0B" title="Giao dịch chờ kiểm duyệt" hint="Đã gửi ảnh xác nhận" />
      {query.isLoading ? (
        <LoadingState label="Đang tải giao dịch…" />
      ) : query.isError ? (
        <EmptyState title="Không tải được giao dịch" description="Kéo xuống để tải lại." />
      ) : visible.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Chưa có giao dịch chờ duyệt." />
      ) : (
        visible.map((payment) => {
          const busy = review.isPending && review.variables?.id === payment.id;
          return (
            <AdminRow key={payment.id}>
              <View className="gap-1">
                <Text className="font-bold text-slate-900 dark:text-white">{payment.user_name}</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400" selectable>
                  {payment.user_email}
                </Text>
                <Text className="font-mono text-sm font-bold text-brand dark:text-brand-dark" selectable>
                  {payment.payment_code}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDateTimeVi(payment.submitted_at)} · {formatVnd(payment.amount)}
                </Text>
              </View>
              {payment.proof_url ? (
                <View className="overflow-hidden rounded-xl border border-border dark:border-border-dark">
                  <PostMedia url={payment.proof_url} type="image" label="Ảnh chuyển khoản" height={240} />
                </View>
              ) : null}
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  label="Từ chối"
                  disabled={busy}
                  onPress={() => askReview(payment, 'REJECTED')}
                  className="flex-1 border-rose-400/50"
                  textClassName="text-rose-600 dark:text-rose-400"
                />
                <Button
                  size="sm"
                  label="Duyệt và kích hoạt"
                  loading={busy}
                  onPress={() => askReview(payment, 'APPROVED')}
                  className="flex-1 bg-emerald-600 dark:bg-emerald-600"
                />
              </View>
            </AdminRow>
          );
        })
      )}
      <ShowMoreButton remaining={remaining} onPress={showMore} />
    </View>
  );
}

function ActiveAccounts({
  query,
  notify,
}: {
  query: ReturnType<typeof usePremiumAccountsQuery>;
  notify: (message: string) => void;
}) {
  const revoke = useRevokePremiumMutation();
  const { visible, remaining, showMore } = useShowMore(query.data ?? []);

  const askRevoke = (account: AdminPremiumAccount) =>
    confirmAction({
      title: 'Hủy kích hoạt Premium',
      message: `Hủy Premium của ${account.user_name || account.user_email}?`,
      confirmLabel: 'Hủy kích hoạt',
      onConfirm: () =>
        revoke.mutate(account.user_id, {
          onSuccess: () => notify(`Đã hủy kích hoạt Premium của ${account.user_name || account.user_email}.`),
          onError: (error) => showError(error, 'Không thể hủy kích hoạt Premium.'),
        }),
    });

  return (
    <View className="gap-3">
      <SectionHeading icon={CheckCircle2} iconColor="#10B981" title="Tài khoản đang kích hoạt" hint="Premium còn hạn" />
      {query.isLoading ? (
        <LoadingState label="Đang tải tài khoản Premium…" />
      ) : query.isError ? (
        <EmptyState title="Không tải được tài khoản Premium" description="Kéo xuống để tải lại." />
      ) : visible.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Chưa có tài khoản Premium đang kích hoạt." />
      ) : (
        visible.map((account) => (
          <AdminRow key={account.user_id} tone="success">
            <View className="gap-1">
              <Text className="font-bold text-slate-900 dark:text-white">{account.user_name}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400" selectable>
                {account.user_email}
              </Text>
              <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                Kích hoạt đến {formatDateTimeVi(account.premium_until)}
              </Text>
              {account.last_payment_submitted_at ? (
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Giao dịch: {formatDateTimeVi(account.last_payment_submitted_at)} ·{' '}
                  {formatVnd(account.last_payment_amount)}
                </Text>
              ) : null}
              {account.last_payment_code ? (
                <Text className="font-mono text-xs text-slate-500 dark:text-slate-400" selectable>
                  Mã giao dịch: {account.last_payment_code}
                </Text>
              ) : null}
            </View>
            {account.last_payment_proof_url ? (
              <View className="overflow-hidden rounded-xl border border-border dark:border-border-dark">
                <PostMedia url={account.last_payment_proof_url} type="image" label="Ảnh chuyển khoản đã duyệt" height={150} />
              </View>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              label="Hủy kích hoạt"
              loading={revoke.isPending && revoke.variables === account.user_id}
              onPress={() => askRevoke(account)}
              className="self-start border-rose-400/50"
              textClassName="text-rose-600 dark:text-rose-400"
            />
          </AdminRow>
        ))
      )}
      <ShowMoreButton remaining={remaining} onPress={showMore} />
    </View>
  );
}

const PROCESSED_FILTERS: { value: ProcessedPaymentFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
];

/** Transactions already approved or rejected, so past decisions can be looked up again. */
function ProcessedPayments() {
  const [filter, setFilter] = useState<ProcessedPaymentFilter>('ALL');
  const query = useProcessedPaymentsQuery(filter);
  const { visible, remaining, showMore } = useShowMore(query.data ?? []);

  return (
    <View className="gap-3">
      <SectionHeading icon={History} iconColor="#537fff" title="Giao dịch đã xử lý" hint="Đã duyệt hoặc từ chối" />
      <Segmented value={filter} onChange={setFilter} options={PROCESSED_FILTERS} />
      {query.isLoading ? (
        <LoadingState label="Đang tải giao dịch…" />
      ) : query.isError ? (
        <EmptyState title="Không tải được giao dịch" description="Kéo xuống để tải lại." />
      ) : visible.length === 0 ? (
        <EmptyState icon={History} title="Chưa có giao dịch đã xử lý." />
      ) : (
        visible.map((payment) => {
          const approved = payment.status === 'APPROVED';
          return (
            <AdminRow key={payment.id} tone={approved ? 'success' : 'default'}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="font-bold text-slate-900 dark:text-white">{payment.user_name}</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400" selectable>
                    {payment.user_email}
                  </Text>
                  <Text className="font-mono text-sm font-bold text-brand dark:text-brand-dark" selectable>
                    {payment.payment_code}
                  </Text>
                </View>
                <Badge variant={approved ? 'success' : 'danger'} label={approved ? 'Đã duyệt' : 'Từ chối'} />
              </View>
              <View className="gap-0.5">
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Gửi: {formatDateTimeVi(payment.submitted_at)} · {formatVnd(payment.amount)}
                </Text>
                {payment.reviewed_at ? (
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    Xử lý: {formatDateTimeVi(payment.reviewed_at)}
                  </Text>
                ) : null}
                {payment.review_note ? (
                  <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">Ghi chú: {payment.review_note}</Text>
                ) : null}
              </View>
              {payment.proof_url ? (
                <View className="overflow-hidden rounded-xl border border-border dark:border-border-dark">
                  <PostMedia url={payment.proof_url} type="image" label="Ảnh chuyển khoản" height={150} />
                </View>
              ) : null}
            </AdminRow>
          );
        })
      )}
      <ShowMoreButton remaining={remaining} onPress={showMore} />
    </View>
  );
}
