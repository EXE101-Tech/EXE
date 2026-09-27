import { Check, X } from 'lucide-react-native';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { useLfgParticipantsQuery, useSetLfgParticipantStatusMutation } from '@/hooks/queries/use-lfg';

interface LfgParticipantsModalProps {
  visible: boolean;
  postId: number;
  onClose: () => void;
}

export function LfgParticipantsModal({ visible, postId, onClose }: LfgParticipantsModalProps) {
  const { data, isLoading } = useLfgParticipantsQuery(postId, 'PENDING');
  const setStatus = useSetLfgParticipantStatusMutation(postId);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
          <Text className="text-lg font-black text-slate-900 dark:text-white">Yêu cầu tham gia</Text>
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
                <Avatar uri={item.avatar_url} fallback={item.name} size={40} />
                <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                  {item.name}
                </Text>
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
              </View>
            )}
            ListEmptyComponent={<EmptyState title="Không có yêu cầu tham gia nào đang chờ duyệt" />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
