import { Check, X } from 'lucide-react-native';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { useGameroomQuery, useSetGameroomParticipantStatusMutation } from '@/hooks/queries/use-gamerooms';

interface GameroomParticipantsModalProps {
  visible: boolean;
  roomId: number;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Đang chờ',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
};

export function GameroomParticipantsModal({ visible, roomId, onClose }: GameroomParticipantsModalProps) {
  const { data: room, isLoading } = useGameroomQuery(roomId);
  const setStatus = useSetGameroomParticipantStatusMutation(roomId);
  const participants = (room?.participants ?? []).filter((p) => p.role !== 'HOST');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
          <Text className="text-lg font-black text-slate-900 dark:text-white">Người tham gia</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <X size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <LoadingState label="Đang tải…" />
        ) : (
          <FlatList
            data={participants}
            keyExtractor={(item) => String(item.id)}
            contentContainerClassName="gap-2.5 p-4"
            renderItem={({ item }) => (
              <View className="flex-row items-center gap-3 rounded-2xl border border-border p-3 dark:border-border-dark">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                    {item.user.profile?.full_name || item.user.email}
                  </Text>
                  <Badge
                    variant={item.status === 'APPROVED' ? 'success' : item.status === 'PENDING' ? 'warning' : 'neutral'}
                    label={STATUS_LABEL[item.status] ?? item.status}
                    className="mt-1"
                  />
                </View>
                {item.status === 'PENDING' ? (
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
            ListEmptyComponent={<EmptyState title="Chưa có ai tham gia phòng này" />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
