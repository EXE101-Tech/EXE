import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Ban, Check, Flag, Send, UserPlus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { chatApi } from '@/api/chat';
import { moderationApi } from '@/api/moderation';
import { resolveMediaUrl } from '@/api/resolve-media-url';
import { LoadingState } from '@/components/brand/loading-state';
import { Avatar } from '@/components/ui/avatar';
import {
  useAcceptFriendRequestMutation,
  useMessagesQuery,
  useSendFriendRequestMutation,
  useSendMessageMutation,
} from '@/hooks/queries/use-chat';
import type { ChatMessageResponse } from '@/schemas/chat';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { showAlert } from '@/stores/dialog-store';
import { ReportModal } from '@/components/moderation/report-modal';

const formatTime = (value: string) => {
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data, isLoading } = useMessagesQuery(conversationId);
  const sendMessage = useSendMessageMutation(conversationId);
  const sendFriendRequest = useSendFriendRequestMutation();
  const acceptFriendRequest = useAcceptFriendRequestMutation();
  const [text, setText] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  // The polled query always holds the newest page; older pages are fetched on demand and kept here.
  // Tagged with the conversation id so a different thread never shows another thread's history.
  const [olderPages, setOlderPages] = useState<{
    conversationId: number;
    messages: ChatMessageResponse[];
    hasMore: boolean;
  } | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const loadedOlder = olderPages?.conversationId === conversationId ? olderPages : null;
  const older = loadedOlder?.messages;

  const ordered = useMemo(() => {
    const seen = new Set<number>();
    return [...(older ?? []), ...(data?.messages ?? [])].filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
  }, [older, data?.messages]);
  const messages = [...ordered].reverse();
  const hasOlder = loadedOlder?.hasMore ?? data?.has_more ?? false;

  const loadOlder = async () => {
    const oldestId = ordered[0]?.id;
    if (!oldestId || isLoadingOlder) return;
    setIsLoadingOlder(true);
    try {
      const page = await chatApi.getMessages(conversationId, { before_id: oldestId, limit: 50 });
      setOlderPages((current) => ({
        conversationId,
        messages: [...page.messages, ...(current?.conversationId === conversationId ? current.messages : [])],
        hasMore: page.has_more,
      }));
    } catch (error) {
      showAlert('Lỗi', error instanceof Error ? error.message : 'Không tải được tin nhắn cũ hơn');
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const friendship = data?.friendship_status ?? 'none';
  const friendshipLabel =
    friendship === 'accepted'
      ? 'Bạn bè'
      : friendship === 'incoming'
        ? 'Đã gửi lời mời cho bạn'
        : friendship === 'outgoing'
          ? 'Đã gửi lời mời'
          : 'Người lạ';
  const friendActionBusy = sendFriendRequest.isPending || acceptFriendRequest.isPending;
  const handleFriendAction = () => {
    if (!data) return;
    const onError = (error: Error) => showAlert('Lỗi', error.message);
    if (friendship === 'none') sendFriendRequest.mutate(data.other_user.id, { onError });
    else if (friendship === 'incoming' && data.friendship_id != null) {
      acceptFriendRequest.mutate(data.friendship_id, { onError });
    }
  };

  const handleSend = () => {
    const value = text.trim();
    if (!value || sendMessage.isPending) return;
    setText('');
    sendMessage.mutate(value);
  };

  const handleBlock = () => {
    if (!data) return;
    showAlert('Chặn người dùng', `Bạn sẽ không thể tiếp tục nhắn tin với ${data.other_user.name}.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Chặn',
        style: 'destructive',
        onPress: () => moderationApi.block(data.other_user.id)
          .then(() => router.replace('/chat'))
          .catch((error) => showAlert('Lỗi', error instanceof Error ? error.message : 'Không thể chặn người dùng.')),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-3 border-b border-border px-4 py-3 dark:border-border-dark">
        <Pressable onPress={() => router.replace('/chat')} hitSlop={8}>
          <ArrowLeft size={22} color="#94A3B8" />
        </Pressable>
        {data ? (
          <>
            <Avatar uri={resolveMediaUrl(data.other_user.avatar_url)} fallback={data.other_user.name} size={36} premium={data.other_user.is_premium} />
            <View className="flex-1">
              <Text className="text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>
                {data.other_user.name}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text
                  className={cn(
                    'text-[11px] font-semibold',
                    friendship === 'accepted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {friendshipLabel}
                </Text>
                {friendship === 'none' || (friendship === 'incoming' && data.friendship_id != null) ? (
                  <Pressable
                    onPress={handleFriendAction}
                    disabled={friendActionBusy}
                    hitSlop={6}
                    className="flex-row items-center gap-1 disabled:opacity-50"
                  >
                    {friendship === 'none' ? (
                      <UserPlus size={12} color="#537fff" />
                    ) : (
                      <Check size={12} color="#537fff" />
                    )}
                    <Text className="text-[11px] font-bold text-brand dark:text-brand-dark">
                      {friendship === 'none' ? 'Kết bạn' : 'Chấp nhận'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Pressable onPress={() => setReportOpen(true)} accessibilityLabel="Báo cáo người dùng" className="rounded-xl p-2">
                <Flag size={16} color="#D97706" />
              </Pressable>
              <Pressable onPress={handleBlock} accessibilityLabel="Chặn người dùng" className="rounded-xl p-2">
                <Ban size={16} color="#E11D48" />
              </Pressable>
            </View>
          </>
        ) : null}
      </View>

      {isLoading ? (
        <LoadingState label="Đang tải tin nhắn…" />
      ) : (
        <FlatList
          className="flex-1"
          data={messages}
          inverted
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-2.5 px-4 py-4"
          // The list is inverted, so the footer sits above the oldest message.
          ListFooterComponent={
            hasOlder ? (
              <Pressable
                onPress={loadOlder}
                disabled={isLoadingOlder}
                className="mx-auto mb-2 min-h-7 items-center justify-center rounded-full bg-slate-100 px-3 py-1 dark:bg-white/10"
              >
                {isLoadingOlder ? (
                  <ActivityIndicator size="small" color="#537fff" />
                ) : (
                  <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                    Xem tin nhắn cũ hơn
                  </Text>
                )}
              </Pressable>
            ) : null
          }
          renderItem={({ item }: { item: ChatMessageResponse }) => {
            const own = item.sender_id === currentUserId;
            return (
              <View className={cn('flex-row', own ? 'justify-end' : 'justify-start')}>
                <View
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2.5',
                    own ? 'bg-brand dark:bg-brand-dark' : 'bg-slate-100 dark:bg-white/10',
                  )}
                >
                  <Text className={cn('text-sm', own ? 'text-white' : 'text-slate-900 dark:text-white')}>
                    {item.text}
                  </Text>
                  <Text className={cn('mt-1 text-right text-[10px]', own ? 'text-white/75' : 'text-slate-400')}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text className="mt-8 text-center text-xs text-slate-500">
              Bắt đầu cuộc trò chuyện với {data?.other_user.name}.
            </Text>
          }
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center gap-2 border-t border-border px-4 py-3 dark:border-border-dark">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#94A3B8"
            maxLength={4000}
            className="h-11 flex-1 rounded-full border border-border bg-slate-50 px-4 text-sm text-slate-900 dark:border-border-dark dark:bg-white/5 dark:text-white"
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            className="h-11 w-11 items-center justify-center rounded-full bg-brand disabled:opacity-50 dark:bg-brand-dark"
          >
            <Send size={17} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {data ? <ReportModal visible={reportOpen} targetType="user" targetId={data.other_user.id} onClose={() => setReportOpen(false)} onSubmitted={() => showAlert('Đã gửi báo cáo', 'Quản trị viên SportGo sẽ xem xét báo cáo này.')} /> : null}
    </SafeAreaView>
  );
}
