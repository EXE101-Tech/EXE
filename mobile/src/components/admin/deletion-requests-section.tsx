import { Text } from '@/components/ui/text';
import { CheckCircle2, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { Button } from '@/components/ui/button';
import { useAdminDeletionRequestsQuery, useCompleteDeletionRequestMutation } from '@/hooks/queries/use-admin';
import type { AdminDeletionRequest } from '@/schemas/admin';
import {
  AdminRow,
  SectionHeading,
  ShowMoreButton,
  confirmAction,
  formatDateTimeVi,
  showError,
  useShowMore,
} from './admin-ui';

/** Requests to delete an account made from the website (web: "Yêu cầu xoá"), deleted after the admin verifies them. */
export function DeletionRequestsSection({ notify }: { notify: (message: string) => void }) {
  const query = useAdminDeletionRequestsQuery();
  const complete = useCompleteDeletionRequestMutation();
  const { visible, remaining, showMore } = useShowMore(query.data ?? []);

  const askComplete = (request: AdminDeletionRequest) =>
    confirmAction({
      title: 'Xóa tài khoản',
      message: `Xử lý yêu cầu xóa dữ liệu của ${request.email}? Tài khoản và dữ liệu của họ sẽ bị xóa và không thể hoàn tác.`,
      confirmLabel: 'Xóa tài khoản',
      onConfirm: () =>
        complete.mutate(request.id, {
          onSuccess: () => notify('Đã xử lý yêu cầu xóa tài khoản.'),
          onError: (error) => showError(error, 'Không thể xử lý yêu cầu xóa.'),
        }),
    });

  return (
    <View className="gap-3">
      <SectionHeading
        icon={Trash2}
        iconColor="#E11D48"
        title={query.data ? `Yêu cầu xóa tài khoản (${query.data.length})` : 'Yêu cầu xóa tài khoản'}
        hint="Xóa sau khi xác minh"
      />
      {query.isLoading ? (
        <LoadingState label="Đang tải yêu cầu…" />
      ) : query.isError ? (
        <EmptyState title="Không tải được yêu cầu xóa" description="Kéo xuống để tải lại." />
      ) : visible.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Chưa có yêu cầu xóa đang chờ xử lý." />
      ) : (
        visible.map((request) => {
          const busy = complete.isPending && complete.variables === request.id;
          return (
            <AdminRow key={request.id}>
              <View className="gap-1">
                <Text className="font-bold text-slate-900 dark:text-white" selectable>
                  {request.email}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDateTimeVi(request.created_at)}
                  {request.reason ? ` · ${request.reason}` : ''}
                </Text>
              </View>
              <Button
                variant="outline"
                size="sm"
                loading={busy}
                onPress={() => askComplete(request)}
                className="self-start border-rose-400/50"
              >
                <Trash2 size={14} color="#E11D48" />
                <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">Xóa sau khi xác minh</Text>
              </Button>
            </AdminRow>
          );
        })
      )}
      <ShowMoreButton remaining={remaining} onPress={showMore} />
    </View>
  );
}
