import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { LoadingState } from '@/components/brand/loading-state';
import { Avatar } from '@/components/ui/avatar';
import { useMessagesQuery, useSendMessageMutation } from '@/hooks/queries/use-chat';
import type { ChatMessageResponse } from '@/schemas/chat';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

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
  const [text, setText] = useState('');

  const messages = [...(data?.messages ?? [])].reverse();

  const handleSend = () => {
    const value = text.trim();
    if (!value || sendMessage.isPending) return;
    setText('');
    sendMessage.mutate(value);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-3 border-b border-border px-4 py-3 dark:border-border-dark">
        <Pressable onPress={() => router.replace('/chat')} hitSlop={8}>
          <ArrowLeft size={22} color="#94A3B8" />
        </Pressable>
        {data ? (
          <>
            <Avatar uri={resolveMediaUrl(data.other_user.avatar_url)} fallback={data.other_user.name} size={36} />
            <Text className="text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>
              {data.other_user.name}
            </Text>
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
    </SafeAreaView>
  );
}
