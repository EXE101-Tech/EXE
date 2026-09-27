import { Check, Trash2, X } from 'lucide-react-native';
import { Alert, FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { useRemoveTeamMutation, useSetTeamMemberStatusMutation, useTeamMembersQuery } from '@/hooks/queries/use-teams';

interface TeamMembersModalProps {
  visible: boolean;
  teamId: number;
  canManage: boolean;
  onClose: () => void;
}

export function TeamMembersModal({ visible, teamId, canManage, onClose }: TeamMembersModalProps) {
  const { data, isLoading } = useTeamMembersQuery(teamId);
  const setStatus = useSetTeamMemberStatusMutation(teamId);
  const removeTeam = useRemoveTeamMutation();

  const handleDisband = () => {
    Alert.alert('Giải thể CLB', 'Bạn có chắc muốn giải thể CLB này? Hành động này không thể hoàn tác.', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Giải thể',
        style: 'destructive',
        onPress: () =>
          removeTeam.mutate(teamId, {
            onSuccess: onClose,
            onError: (e) => Alert.alert('Lỗi', e.message),
          }),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
          <Text className="text-lg font-black text-slate-900 dark:text-white">Thành viên CLB</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <X size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <LoadingState label="Đang tải…" />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(item) => String(item.id)}
            contentContainerClassName="gap-2.5 p-4"
            renderItem={({ item }) => (
              <View className="flex-row items-center gap-3 rounded-2xl border border-border p-3 dark:border-border-dark">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                    {item.full_name || item.email || `Thành viên #${item.user_id}`}
                  </Text>
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
              </View>
            )}
            ListEmptyComponent={<EmptyState title="CLB chưa có thành viên nào" />}
            ListFooterComponent={
              canManage ? (
                <TouchableOpacity onPress={handleDisband} className="mt-4 flex-row items-center justify-center gap-2 py-2">
                  <Trash2 size={14} color="#E11D48" />
                  <Text className="text-xs font-bold text-rose-600">Giải thể CLB</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
