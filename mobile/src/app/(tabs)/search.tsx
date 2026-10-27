import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { ArrowLeft, Check, MessageCircle, MessageSquareText, Search, Swords, Trophy, UserCheck, UserPlus, Users } from 'lucide-react-native';
import { useEffect, useState, type ComponentType } from 'react';
import { FlatList, Pressable, TouchableOpacity, View } from 'react-native';
import { resolveMediaUrl } from '@/api/resolve-media-url';
import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  useAcceptFriendRequestMutation,
  useSearchChatUsersQuery,
  useSendFriendRequestMutation,
  useStartConversationMutation,
} from '@/hooks/queries/use-chat';
import { useSearchQuery } from '@/hooks/queries/use-search';
import { SPORTS } from '@/lib/constants';
import { isPremiumUser } from '@/lib/premium';
import type { ChatUserSearchResponse } from '@/schemas/chat';
import type { SearchResult } from '@/schemas/common';
import { showAlert } from '@/stores/dialog-store';
import { UserName } from '@/components/ui/user-name';

const MAX_RESULTS = 12;
const MAX_PEOPLE = 3;

const KIND_META: Record<string, { icon: ComponentType<{ size?: number; color?: string }>; label: string }> = {
  sport: { icon: Trophy, label: 'Môn thể thao' },
  gameroom: { icon: Swords, label: 'Trận đấu' },
  team: { icon: Users, label: 'CLB' },
  social_post: { icon: MessageSquareText, label: 'Bài viết' },
};

/** One line in the combined result list; `person` is set for users and `sportKey` for sport shortcuts. */
interface Row {
  kind: string;
  id: string | number;
  title: string;
  subtitle: string;
  person?: ChatUserSearchResponse;
  sportKey?: string;
}

const normalize = (value: string) => value.toLocaleLowerCase('vi-VN');

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const term = debouncedQuery.trim();
  const { data: results, isLoading: isLoadingResults } = useSearchQuery(term);
  const { data: people, isLoading: isLoadingPeople } = useSearchChatUsersQuery(term);
  const startConversation = useStartConversationMutation();
  const sendRequest = useSendFriendRequestMutation();
  const acceptRequest = useAcceptFriendRequestMutation();

  const openChat = async (userId: number) => {
    try {
      const conversation = await startConversation.mutateAsync(userId);
      router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } });
    } catch (error) {
      showAlert('Lỗi', error instanceof Error ? error.message : 'Không mở được cuộc trò chuyện');
    }
  };

  const handleFriendAction = (person: ChatUserSearchResponse) => {
    const onError = (error: Error) => showAlert('Lỗi', error.message);
    if (person.friendship_status === 'incoming' && person.friendship_id != null) {
      acceptRequest.mutate(person.friendship_id, { onError });
    } else if (person.friendship_status === 'none') {
      sendRequest.mutate(person.id, { onError });
    }
  };

  const handlePress = (row: Row) => {
    if (row.kind === 'user' && row.person) {
      openChat(row.person.id);
    } else if (row.kind === 'sport') {
      router.navigate({ pathname: '/(tabs)/gamerooms', params: { sport: row.sportKey } });
    } else if (row.kind === 'gameroom') {
      router.navigate({ pathname: '/(tabs)/gamerooms', params: { search: row.title } });
    } else if (row.kind === 'team') {
      router.push({ pathname: '/teams/[id]', params: { id: String(row.id) } });
    } else if (row.kind === 'social_post') {
      router.navigate({ pathname: '/(tabs)/forum', params: { search: term } });
    }
  };

  const sportRows: Row[] = SPORTS.filter(
    (sport) => normalize(sport.name).includes(normalize(term)) || sport.key.includes(normalize(term)),
  ).map((sport) => ({
    kind: 'sport',
    id: sport.key,
    title: sport.name,
    subtitle: 'Tìm phòng theo môn',
    sportKey: sport.key,
  }));
  const userRows: Row[] = (people ?? []).slice(0, MAX_PEOPLE).map((person) => ({
    kind: 'user',
    id: person.id,
    title: person.name,
    subtitle: 'Người chơi',
    person,
  }));
  const resultRows: Row[] = (results ?? [])
    .filter((item: SearchResult) => item.kind !== 'venue')
    .map((item) => ({ kind: item.kind, id: item.id, title: item.title, subtitle: item.subtitle }));
  const rows = term.length >= 2 ? [...sportRows, ...userRows, ...resultRows].slice(0, MAX_RESULTS) : [];
  const isLoading = term.length >= 2 && (isLoadingResults || isLoadingPeople) && rows.length === 0;

  const renderFriendAction = (person: ChatUserSearchResponse) => {
    if (person.friendship_status === 'accepted') {
      return (
        <View className="flex-row items-center gap-1">
          <MessageCircle size={14} color="#537fff" />
          <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Bạn bè</Text>
        </View>
      );
    }
    if (person.friendship_status === 'outgoing') {
      return (
        <View className="flex-row items-center gap-1">
          <UserCheck size={14} color="#94A3B8" />
          <Text className="text-xs font-semibold text-slate-400">Đã gửi</Text>
        </View>
      );
    }
    const incoming = person.friendship_status === 'incoming';
    return (
      <Pressable
        onPress={() => handleFriendAction(person)}
        hitSlop={6}
        className="flex-row items-center gap-1 rounded-lg bg-brand px-2.5 py-2 dark:bg-brand-dark"
      >
        {incoming ? <Check size={13} color="#fff" /> : <UserPlus size={13} color="#fff" />}
        <Text className="text-xs font-bold text-white">{incoming ? 'Chấp nhận' : 'Kết bạn'}</Text>
      </Pressable>
    );
  };

  return (
    <ScreenContainer scroll={false} className="gap-3 pt-3">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={22} color="#94A3B8" />
        </Pressable>
        <Input
          autoFocus
          placeholder="Tìm người chơi, email, CLB, phòng, bài viết…"
          value={query}
          onChangeText={setQuery}
          containerClassName="flex-1"
        />
      </View>

      {term.length < 2 ? (
        <EmptyState icon={Search} title="Nhập ít nhất 2 ký tự để tìm kiếm" />
      ) : isLoading ? (
        <LoadingState label="Đang tìm…" />
      ) : (
        <FlatList
          className="flex-1"
          data={rows}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerClassName="gap-2 pb-8"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.kind === 'user' && item.person) {
              const { person } = item;
              const premium = isPremiumUser(person);
              return (
                <TouchableOpacity
                  onPress={() => handlePress(item)}
                  className="flex-row items-center gap-3 rounded-2xl border border-border p-3.5 dark:border-border-dark"
                >
                  <Avatar uri={resolveMediaUrl(person.avatar_url)} fallback={person.name} size={premium ? 36 : 40} premium={premium} />
                  <View className="flex-1">
                    <UserName premium={premium} className="font-bold" numberOfLines={1}>
                      {person.name}
                    </UserName>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">Người chơi · Chạm để nhắn tin</Text>
                  </View>
                  {renderFriendAction(person)}
                </TouchableOpacity>
              );
            }
            const meta = KIND_META[item.kind] ?? KIND_META.social_post;
            const Icon = meta.icon;
            return (
              <TouchableOpacity
                onPress={() => handlePress(item)}
                className="flex-row items-center gap-3 rounded-2xl border border-border p-3.5 dark:border-border-dark"
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand-dark/10">
                  <Icon size={18} color="#537fff" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                    {meta.label} · {item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<EmptyState icon={Search} title="Không tìm thấy kết quả phù hợp" />}
        />
      )}
    </ScreenContainer>
  );
}
