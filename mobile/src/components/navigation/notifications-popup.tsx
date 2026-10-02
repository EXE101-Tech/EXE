import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { PopupModal } from '@/components/ui/popup-modal';
import { useStartConversationMutation } from '@/hooks/queries/use-chat';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '@/hooks/queries/use-notifications';
import { formatDateVi, formatTimeVi } from '@/lib/slots';
import { cn } from '@/lib/utils';
import type { NotificationResponse } from '@/schemas/notifications';
import { useChatUiStore } from '@/stores/chat-ui-store';

interface NotificationsPopupProps {
  visible: boolean;
  onClose: () => void;
}

/** Notification list opened from the bell in the top bar, as a popup rather than a separate screen. */
export function NotificationsPopup({ visible, onClose }: NotificationsPopupProps) {
  const { data, isLoading } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const startConversation = useStartConversationMutation();
  const unread = data?.unread_count ?? 0;

  const handlePress = (item: NotificationResponse) => {
    if (!item.is_read) markRead.mutate(item.id);

    if (item.type === 'chat_message') {
      onClose();
      // Open the sender's conversation; fall back to the chat list if it cannot be resolved.
      if (item.actor?.id) {
        startConversation
          .mutateAsync(item.actor.id)
          .then((conversation) => router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } }))
          .catch(() => router.navigate('/(tabs)/chat'));
      } else {
        router.navigate('/(tabs)/chat');
      }
    } else if (item.type.startsWith('friend_')) {
      onClose();
      // Friend requests are answered from the Bạn bè tab; accepted/removed events just open the chat list.
      useChatUiStore.getState().setActiveTab(item.type === 'friend_request' ? 'friends' : 'messages');
      router.navigate('/(tabs)/chat');
    } else if (item.type.startsWith('team_')) {
      onClose();
      router.navigate('/(tabs)/teams');
    } else if (item.type.startsWith('gameroom_')) {
      onClose();
      router.navigate('/(tabs)/gamerooms');
    } else if (item.type.startsWith('premium_')) {
      // Reopens the payment popup for accounts that are not Premium (yet or any more).
      onClose();
      router.navigate({ pathname: '/(tabs)/premium', params: { pay: '1' } });
    } else if (item.type === 'moderation_warning') {
      onClose();
      router.navigate(item.entity_type === 'team' ? '/(tabs)/teams' : '/(tabs)/gamerooms');
    }
  };

  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title="Thông báo"
      subtitle={unread > 0 ? `${unread} thông báo chưa đọc` : undefined}
      icon={Bell}
      size="sm"
      headerAccessory={
        unread > 0 ? (
          <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
            <Text className="text-xs font-bold text-brand dark:text-brand-dark">Đọc tất cả</Text>
          </Pressable>
        ) : undefined
      }
      bodyClassName="gap-2"
    >
      {isLoading ? (
        <LoadingState label="Đang tải thông báo…" />
      ) : (data?.items ?? []).length === 0 ? (
        <EmptyState icon={Bell} title="Bạn chưa có thông báo nào" />
      ) : (
        (data?.items ?? []).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => handlePress(item)}
            className={cn(
              'gap-1 rounded-2xl border border-border p-3.5 dark:border-border-dark',
              !item.is_read && 'bg-brand/5 dark:bg-brand-dark/10',
            )}
          >
            <View className="flex-row items-center gap-2">
              {!item.is_read ? <View className="h-2 w-2 rounded-full bg-brand dark:bg-brand-dark" /> : null}
              <Text className="flex-1 font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={3}>
              {item.body}
            </Text>
            <Text className="text-[11px] text-slate-400">
              {formatDateVi(item.created_at)} · {formatTimeVi(item.created_at)}
            </Text>
          </Pressable>
        ))
      )}
    </PopupModal>
  );
}
