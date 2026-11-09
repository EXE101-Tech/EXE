import { Text } from '@/components/ui/text';
import { CheckCircle2, Flag } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminReportsQuery, useReviewReportMutation } from '@/hooks/queries/use-admin';
import type { AdminReport, ReportReviewStatus } from '@/schemas/admin';
import { AdminRow, SectionHeading, ShowMoreButton, formatDateTimeVi, showError, useShowMore } from './admin-ui';

/** What a report points at, in words (the server sends the raw type). */
const TARGET_LABELS: Record<string, string> = {
  post: 'Bài viết',
  comment: 'Bình luận',
  user: 'Người dùng',
  message: 'Tin nhắn',
};

/** Reports members sent about posts, comments, users and messages (web: "Báo cáo"). */
export function ReportsSection({ notify }: { notify: (message: string) => void }) {
  const query = useAdminReportsQuery();
  const review = useReviewReportMutation();
  const { visible, remaining, showMore } = useShowMore(query.data ?? []);

  const handleReview = (report: AdminReport, status: ReportReviewStatus) =>
    review.mutate(
      { id: report.id, status },
      {
        onSuccess: () => notify(status === 'RESOLVED' ? 'Đã xử lý báo cáo.' : 'Đã bỏ qua báo cáo.'),
        onError: (error) => showError(error, 'Không thể cập nhật báo cáo.'),
      },
    );

  return (
    <View className="gap-3">
      <SectionHeading
        icon={Flag}
        iconColor="#E11D48"
        title={query.data ? `Báo cáo đang chờ xử lý (${query.data.length})` : 'Báo cáo đang chờ xử lý'}
      />
      {query.isLoading ? (
        <LoadingState label="Đang tải báo cáo…" />
      ) : query.isError ? (
        <EmptyState title="Không tải được báo cáo" description="Kéo xuống để tải lại." />
      ) : visible.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Chưa có báo cáo mới." />
      ) : (
        visible.map((report) => {
          const busy = review.isPending && review.variables?.id === report.id;
          return (
            <AdminRow key={report.id}>
              <View className="gap-1">
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <Badge variant="neutral" label={TARGET_LABELS[report.target_type] ?? report.target_type} />
                  <Text className="font-bold text-slate-900 dark:text-white">#{report.target_id}</Text>
                </View>
                <Text className="text-sm font-bold text-slate-900 dark:text-white">{report.reason}</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {report.details || 'Không có mô tả thêm'}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">{formatDateTimeVi(report.created_at)}</Text>
              </View>
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  label="Bỏ qua"
                  disabled={busy}
                  onPress={() => handleReview(report, 'DISMISSED')}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  label="Đã xử lý"
                  loading={busy}
                  onPress={() => handleReview(report, 'RESOLVED')}
                  className="flex-1 bg-rose-600 dark:bg-rose-600"
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
