import { Text } from '@/components/ui/text';
import { Check, Trash2, Users, X } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PopupModal } from '@/components/ui/popup-modal';
import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { useRemoveTeamMemberMutation, useRemoveTeamMutation, useSetTeamMemberStatusMutation, useTeamMembersQuery } from '@/hooks/queries/use-teams';
import { resolveMediaUrl } from '@/api/resolve-media-url';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/stores/toast-store';
import { showAlert } from '@/stores/dialog-store';
import { UserName } from '@/components/ui/user-name';

interface TeamMembersModalProps {
  visible: boolean;
  teamId: number;
  canManage: boolean;
  onClose: () => void;
}

export function TeamMembersModal({ visible, teamId, canManage, onClose }: TeamMembersModalProps) {
  const { data, isLoading } = useTeamMembersQuery(teamId);
  const setStatus = useSetTeamMemberStatusMutation(teamId);
  const removeMember = useRemoveTeamMemberMutation(teamId);
  const removeTeam = useRemoveTeamMutation();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const handleDisband = () => {
    showAlert('Giải thể CLB', 'Bạn có chắc muốn giải thể CLB này? Hành động này không thể hoàn tác.', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Giải thể',
        style: 'destructive',
        onPress: () =>
          removeTeam.mutate(teamId, {
            onSuccess: onClose,
            onError: (e) => showAlert('Lỗi', e.message),
          }),
      },
    ]);
  };

  const handleRemoveMember = (userId: number, name: string) => {
    showAlert('Xóa thành viên', `Bạn có chắc muốn xóa ${name} khỏi CLB?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => removeMember.mutate(userId, {
          onSuccess: () => showToast(`Đã xóa ${name} khỏi CLB.`),
          onError: (error) => showAlert('Lỗi', error.message),
        }),
      },
    ]);
  };

  const members = data ?? [];

  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title="Thành viên CLB"
      subtitle={members.length ? `${members.length} thành viên` : undefined}
      icon={Users}
      bodyClassName="gap-2.5"
    >
      {isLoading ? (
        <LoadingState label="Đang tải…" />
      ) : members.length === 0 ? (
        <EmptyState title="CLB chưa có thành viên nào" />
      ) : (
        members.map((item) => (
          <View
            key={item.id}
            className="flex-row items-center gap-3 rounded-2xl border border-border p-3 dark:border-border-dark"
          >
            <Avatar
              uri={resolveMediaUrl(item.avatar_url)}
              fallback={item.full_name || 'Người chơi'}
              size={item.is_premium ? 36 : 42}
              premium={item.is_premium}
            />
            <View className="flex-1">
              <UserName premium={item.is_premium} className="text-sm font-bold" numberOfLines={1}>
                {item.full_name || item.email || `Thành viên #${item.user_id}`}
              </UserName>
              <Badge
                variant={item.status === 'APPROVED' ? 'success' : item.status === 'PENDING' ? 'warning' : 'neutral'}
                label={item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'PENDING' ? 'Đang chờ' : item.status}
                className="mt-1"
              />
            </View>
            {canManage && item.status === 'PENDING' ? (
              <View className="flex-row gap-2">
                <Button
                  size="sm"
                  loading={setStatus.isPending && setStatus.variables?.userId === item.user_id}
                  onPress={() => setStatus.mutate({ userId: item.user_id, status: 'APPROVED' })}
                >
                  <Check size={14} color="#fff" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  loading={setStatus.isPending && setStatus.variables?.userId === item.user_id}
                  onPress={() => setStatus.mutate({ userId: item.user_id, status: 'REJECTED' })}
                >
                  <X size={14} color="#fff" />
                </Button>
              </View>
            ) : null}
            {canManage && item.status === 'APPROVED' && item.user_id !== currentUserId ? (
              <Button
                variant="destructive"
                size="sm"
                loading={removeMember.isPending && removeMember.variables === item.user_id}
                onPress={() => handleRemoveMember(item.user_id, item.full_name || 'thành viên này')}
              >
                <Trash2 size={14} color="#fff" />
              </Button>
            ) : null}
          </View>
        ))
      )}

      {canManage ? (
        <TouchableOpacity onPress={handleDisband} className="mt-2 flex-row items-center justify-center gap-2 py-2">
          <Trash2 size={14} color="#E11D48" />
          <Text className="text-xs font-bold text-rose-600">Giải thể CLB</Text>
        </TouchableOpacity>
      ) : null}
    </PopupModal>
  );
}
