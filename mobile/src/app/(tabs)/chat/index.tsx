import { router } from 'expo-router';
import { Check, MessageCircle, MessageSquare, Search, UserCheck, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { Avatar } from '@/components/ui/avatar';
import {
  useAcceptFriendRequestMutation,
  useConversationsQuery,
  useFriendRequestsQuery,
  useFriendsQuery,
  useSearchChatUsersQuery,
  useSendFriendRequestMutation,
  useStartConversationMutation,
} from '@/hooks/queries/use-chat';
import type { ChatConversationResponse, ChatUserSearchResponse, FriendshipResponse } from '@/schemas/chat';

type Tab = 'messages' | 'friends';

const formatUpdatedAt = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export default function ChatListScreen() {
  const [tab, setTab] = useState<Tab>('messages');
  const [query, setQuery] = useState('');

  const { data: conversations, isLoading: isLoadingConversations } = useConversationsQuery();
  const { data: friendRequests } = useFriendRequestsQuery();
  const { data: friends } = useFriendsQuery();
  const { data: searchResults, isFetching: isSearching } = useSearchChatUsersQuery(tab === 'friends' ? query : '');

  const startConversation = useStartConversationMutation();
  const acceptRequest = useAcceptFriendRequestMutation();
  const sendRequest = useSendFriendRequestMutation();

  const openConversation = async (recipientId: number) => {
    try {
      const conversation = await startConversation.mutateAsync(recipientId);
      router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } });
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không mở được cuộc trò chuyện');
    }
  };

  const trimmedQuery = query.trim();
  const filteredConversations = (conversations ?? []).filter((c) =>
    c.other_user.name.toLowerCase().includes(trimmedQuery.toLowerCase()),
  );
  const searchedIds = new Set((searchResults ?? []).map((p) => p.id));
  const filteredFriends = (friends ?? []).filter(
    (f) => f.user.name.toLowerCase().includes(trimmedQuery.toLowerCase()) && !searchedIds.has(f.user.id),
  );

  const renderConversation = ({ item }: { item: ChatConversationResponse }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: String(item.id) } })}
      className="flex-row items-center gap-3 px-1 py-3"
    >
      <Avatar uri={resolveMediaUrl(item.other_user.avatar_url)} fallback={item.other_user.name} size={48} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
          {item.other_user.name}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
          {item.last_message || 'Chưa có tin nhắn'}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="text-[11px] text-slate-400">{formatUpdatedAt(item.updated_at)}</Text>
        {item.unread_count > 0 ? (
          <View className="h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 dark:bg-brand-dark">
            <Text className="text-[10px] font-black text-white">{item.unread_count}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderFriendRequest = (request: FriendshipResponse) => (
    <View key={`request-${request.id}`} className="flex-row items-center gap-3 px-1 py-3">
      <Avatar uri={resolveMediaUrl(request.user.avatar_url)} fallback={request.user.name} size={44} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
          {request.user.name}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">Lời mời kết bạn</Text>
      </View>
      <TouchableOpacity
        disabled={acceptRequest.isPending && acceptRequest.variables === request.id}
        onPress={() => acceptRequest.mutate(request.id)}
        className="flex-row items-center gap-1 rounded-lg bg-brand px-2.5 py-2 dark:bg-brand-dark"
      >
        <Check size={13} color="#fff" />
        <Text className="text-xs font-bold text-white">Chấp nhận</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchedPerson = (person: ChatUserSearchResponse) => (
    <View key={`person-${person.id}`} className="flex-row items-center gap-3 px-1 py-3">
      <Avatar uri={resolveMediaUrl(person.avatar_url)} fallback={person.name} size={44} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
          {person.name}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {person.friendship_status === 'accepted'
            ? 'Bạn bè'
            : person.friendship_status === 'incoming'
              ? 'Đã gửi lời mời cho bạn'
              : person.friendship_status === 'outgoing'
                ? 'Đã gửi lời mời'
                : 'Người dùng SportGo'}
        </Text>
      </View>
      {person.friendship_status === 'none' ? (
        <TouchableOpacity
          disabled={sendRequest.isPending && sendRequest.variables === person.id}
          onPress={() => sendRequest.mutate(person.id)}
          className="flex-row items-center gap-1 rounded-lg bg-brand px-2.5 py-2 dark:bg-brand-dark"
        >
          <UserPlus size={13} color="#fff" />
          <Text className="text-xs font-bold text-white">Kết bạn</Text>
        </TouchableOpacity>
      ) : person.friendship_status === 'incoming' && person.friendship_id != null ? (
        <TouchableOpacity
          disabled={acceptRequest.isPending && acceptRequest.variables === person.friendship_id}
          onPress={() => acceptRequest.mutate(person.friendship_id!)}
          className="flex-row items-center gap-1 rounded-lg bg-brand px-2.5 py-2 dark:bg-brand-dark"
        >
          <Check size={13} color="#fff" />
          <Text className="text-xs font-bold text-white">Chấp nhận</Text>
        </TouchableOpacity>
      ) : person.friendship_status === 'outgoing' ? (
        <View className="flex-row items-center gap-1">
          <UserCheck size={14} color="#94A3B8" />
          <Text className="text-xs font-semibold text-slate-400">Đã gửi</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => openConversation(person.id)}
          className="flex-row items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-2 dark:bg-white/10"
        >
          <MessageCircle size={13} color="#0EA5E9" />
          <Text className="text-xs font-bold text-slate-700 dark:text-white">Chat</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFriend = (friend: FriendshipResponse) => (
    <TouchableOpacity
      key={`friend-${friend.id}`}
      onPress={() => openConversation(friend.user.id)}
      className="flex-row items-center gap-3 px-1 py-3"
    >
      <Avatar uri={resolveMediaUrl(friend.user.avatar_url)} fallback={friend.user.name} size={44} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
          {friend.user.name}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">Bạn bè · Nhấn để nhắn tin</Text>
      </View>
      <MessageCircle size={16} color="#059669" />
    </TouchableOpacity>
  );

  return (
    <ScreenContainer scroll={false} className="px-4">
      <TopNavbar />
      <Text className="mb-3 text-xl font-black text-slate-900 dark:text-white">Chat</Text>

      <View className="mb-3 flex-row items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 dark:border-border-dark dark:bg-white/5">
        <Search size={14} color="#94A3B8" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm kiếm..."
          placeholderTextColor="#94A3B8"
          className="h-10 flex-1 text-sm text-slate-900 dark:text-white"
        />
      </View>

      <View className="mb-3 flex-row rounded-xl bg-slate-100 p-1 dark:bg-white/10">
        {(['messages', 'friends'] as const).map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => {
              setTab(value);
              setQuery('');
            }}
            className={`flex-1 rounded-lg py-2 ${tab === value ? 'bg-white dark:bg-[#0F1E36]' : ''}`}
          >
            <Text
              className={`text-center text-xs font-bold ${tab === value ? 'text-brand dark:text-brand-dark' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {value === 'messages' ? 'Tin nhắn' : 'Bạn bè'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'messages' ? (
        isLoadingConversations ? (
          <LoadingState label="Đang tải cuộc trò chuyện…" />
        ) : (
          <FlatList
            className="flex-1"
            data={filteredConversations}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderConversation}
            ItemSeparatorComponent={() => <View className="h-px bg-border dark:bg-border-dark" />}
            ListEmptyComponent={
              <EmptyState
                icon={MessageSquare}
                title="Chưa có cuộc trò chuyện"
                description="Mở tab Bạn bè để tìm và kết bạn."
              />
            }
          />
        )
      ) : (
        <FlatList
          className="flex-1"
          data={[1]}
          keyExtractor={() => 'friends'}
          renderItem={() => (
            <View>
              {(friendRequests ?? []).map(renderFriendRequest)}
              {trimmedQuery.length >= 2 ? (
                isSearching ? (
                  <Text className="py-4 text-center text-xs text-slate-500">Đang tìm người dùng…</Text>
                ) : (searchResults ?? []).length === 0 ? (
                  <Text className="py-4 text-center text-xs text-slate-500">Không tìm thấy người dùng phù hợp.</Text>
                ) : (
                  (searchResults ?? []).map(renderSearchedPerson)
                )
              ) : null}
              {filteredFriends.map(renderFriend)}
              {trimmedQuery.length < 2 && (friends ?? []).length === 0 && (friendRequests ?? []).length === 0 ? (
                <Text className="py-6 text-center text-sm text-slate-500">
                  Tìm theo tên từ 2 ký tự để thêm bạn bè.
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}
