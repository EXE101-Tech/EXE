import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { CalendarClock, Crown, MapPin, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { JoinRoomModal } from '@/components/gamerooms/join-room-modal';
import { Avatar } from '@/components/ui/avatar';
import { useFriendsQuery, useStartConversationMutation } from '@/hooks/queries/use-chat';
import { useGameroomsQuery, useJoinGameroomMutation } from '@/hooks/queries/use-gamerooms';
import { useJoinTeamMutation, useTeamsQuery } from '@/hooks/queries/use-teams';
import { SPORTS } from '@/lib/constants';
import { isPremiumUser } from '@/lib/premium';
import { formatDateVi, formatTimeVi, isFutureTime } from '@/lib/slots';
import { cn } from '@/lib/utils';
import type { MatchResponse } from '@/schemas/gamerooms';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/stores/toast-store';
import { ContentPreviewModal, type PreviewTarget } from './content-preview-modal';
import { showAlert } from '@/stores/dialog-store';

const MAX_ITEMS = 8;

function Section({
  title,
  actionLabel,
  onAction,
  emptyText,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Shown instead of the list when there is nothing to suggest (web side panels do the same). */
  emptyText?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-black text-slate-900 dark:text-white">{title}</Text>
        {actionLabel ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text className="text-xs font-bold text-brand dark:text-brand-dark">{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {emptyText ? (
        <Text className="rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-slate-500 dark:border-border-dark dark:text-slate-400">
          {emptyText}
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-4">
          {children}
        </ScrollView>
      )}
    </View>
  );
}

/** Mobile counterpart of the web feed side panels: open rooms, clubs to discover, and friends to message. */
export function FeedSuggestions() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: rooms } = useGameroomsQuery();
  const { data: teams } = useTeamsQuery({}, { poll: false });
  const { data: friends } = useFriendsQuery();
  const startConversation = useStartConversationMutation();
  const joinRoom = useJoinGameroomMutation();
  const joinTeam = useJoinTeamMutation();
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [joiningRoom, setJoiningRoom] = useState<MatchResponse | null>(null);

  const openRooms = (rooms ?? [])
    .filter((room) => {
      const isHost = room.host_id === currentUserId;
      // Rooms I am in, or already asked to join, are no longer suggestions (an auto-invite still needs my answer).
      const involved = room.participants.some(
        (p) => p.user_id === currentUserId && (p.status === 'APPROVED' || (p.status === 'PENDING' && p.invite_source !== 'AUTO')),
      );
      return room.status === 'OPEN' && isFutureTime(room.end_time) && !isHost && !involved;
    })
    .slice(0, MAX_ITEMS);
  const discoverTeams = (teams ?? []).filter((team) => !team.is_member && !team.is_captain).slice(0, MAX_ITEMS);
  const people = (friends ?? []).map((friendship) => friendship.user).slice(0, MAX_ITEMS);

  const openChat = async (userId: number) => {
    try {
      const conversation = await startConversation.mutateAsync(userId);
      router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } });
    } catch (error) {
      showAlert('Lỗi', error instanceof Error ? error.message : 'Không mở được cuộc trò chuyện');
    }
  };

  const handlePreviewJoin = (target: PreviewTarget) => {
    if (target.type === 'room') {
      setPreview(null);
      setJoiningRoom(target.item);
      return;
    }
    joinTeam.mutate(target.item.id, {
      onSuccess: () => {
        setPreview(null);
        showToast('Đã gửi yêu cầu tham gia CLB.');
      },
      onError: (error) => showAlert('Lỗi', error.message),
    });
  };

  const confirmJoinRoom = (note: string) => {
    if (!joiningRoom) return;
    joinRoom.mutate(
      { id: joiningRoom.id, note },
      {
        onSuccess: () => {
          setJoiningRoom(null);
          showToast('Đã gửi yêu cầu tham gia phòng.');
        },
        onError: (error) => showAlert('Lỗi', error.message),
      },
    );
  };

  return (
    <View className="gap-4">
      <Section
        title="Phòng sắp diễn ra"
        actionLabel="Xem tất cả"
        onAction={() => router.push('/(tabs)/gamerooms')}
        emptyText={openRooms.length ? undefined : 'Chưa có phòng đang mở. Tạo phòng để bắt đầu một trận mới.'}
      >
        {openRooms.map((room) => {
          const emoji = SPORTS.find((s) => s.name.toLowerCase() === room.sport.name.toLowerCase())?.emoji ?? '🏅';
          const left = Math.max(0, room.max_players - room.participants.filter((p) => p.status === 'APPROVED').length);
          return (
            <Pressable
              key={room.id}
              onPress={() => setPreview({ type: 'room', item: room })}
              className="w-56 gap-1.5 rounded-2xl border border-border bg-white p-3 dark:border-border-dark dark:bg-[#111827]"
            >
              <Text className="text-xs font-bold text-brand dark:text-brand-dark">
                {emoji} {room.sport.name} · {left} chỗ trống
              </Text>
              <Text className="text-sm font-black text-slate-900 dark:text-white" numberOfLines={2}>
                {room.title}
              </Text>
              <View className="flex-row items-center gap-1">
                <CalendarClock size={12} color="#3B82F6" />
                <Text className="flex-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400" numberOfLines={1}>
                  {formatDateVi(room.start_time)} · {formatTimeVi(room.start_time)}
                </Text>
              </View>
              {room.location ? (
                <View className="flex-row items-center gap-1">
                  <MapPin size={12} color="#F43F5E" />
                  <Text className="flex-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400" numberOfLines={1}>
                    {room.location}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </Section>

      <Section
        title="CLB nổi bật"
        actionLabel="Khám phá"
        onAction={() => router.push('/(tabs)/teams')}
        emptyText={discoverTeams.length ? undefined : 'Chưa có CLB nào. Hãy lập cộng đồng đầu tiên.'}
      >
        {discoverTeams.map((team) => (
          <Pressable
            key={team.id}
            onPress={() => setPreview({ type: 'team', item: team })}
            className="w-56 flex-row items-center gap-3 rounded-2xl border border-border bg-white p-3 dark:border-border-dark dark:bg-[#111827]"
          >
            <Avatar uri={resolveMediaUrl(team.image_url)} fallback={team.name} size={40} />
            <View className="flex-1">
              <Text className="text-sm font-black text-slate-900 dark:text-white" numberOfLines={1}>
                {team.name}
              </Text>
              <View className="flex-row items-center gap-1">
                <Users size={11} color="#3B82F6" />
                <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400" numberOfLines={1}>
                  {team.member_count}/{team.total_slots} · {team.sport_name}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </Section>

      {people.length ? (
        <Section title="Bạn bè đang kết nối">
          {people.map((person) => {
            const premium = isPremiumUser(person);
            return (
              <Pressable
                key={person.id}
                onPress={() => openChat(person.id)}
                className="w-20 items-center gap-1.5"
                accessibilityLabel={`Nhắn tin với ${person.name}`}
              >
                <Avatar uri={resolveMediaUrl(person.avatar_url)} fallback={person.name} size={premium ? 44 : 52} premium={premium} />
                <View className="flex-row items-center gap-0.5">
                  <Text
                    className={cn('text-[11px] font-bold', premium ? 'text-[#8b8cff]' : 'text-slate-700 dark:text-slate-200')}
                    numberOfLines={1}
                  >
                    {person.name.split(' ').pop()}
                  </Text>
                  {premium ? <Crown size={9} color="#8b8cff" fill="#8b8cff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </Section>
      ) : null}

      <Text className="text-center text-[11px] text-slate-400">SportGo · Chơi cùng nhau, tiến xa hơn.</Text>

      {preview ? (
        <ContentPreviewModal
          target={preview}
          currentUserId={currentUserId}
          isBusy={joinTeam.isPending}
          onClose={() => setPreview(null)}
          onJoin={handlePreviewJoin}
        />
      ) : null}
      {joiningRoom ? (
        <JoinRoomModal
          room={joiningRoom}
          isLoading={joinRoom.isPending}
          onClose={() => setJoiningRoom(null)}
          onConfirm={confirmJoinRoom}
        />
      ) : null}
    </View>
  );
}
