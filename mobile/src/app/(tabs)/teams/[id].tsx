import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarClock, Crown, MapPin, MessageCircle, Star, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { ImageLightbox } from '@/components/profile/image-lightbox';
import { ReviewTeamModal } from '@/components/teams/review-team-modal';
import { TeamPremiumSettingsModal } from '@/components/teams/team-premium-settings-modal';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useStartConversationMutation } from '@/hooks/queries/use-chat';
import {
  useJoinTeamMutation,
  useTeamMembersQuery,
  useTeamQuery,
  useTeamReviewsQuery,
} from '@/hooks/queries/use-teams';
import { cn } from '@/lib/utils';
import { showToast } from '@/stores/toast-store';
import { showAlert } from '@/stores/dialog-store';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teamId = Number(id);

  const { data: team, isLoading, isError, error } = useTeamQuery(teamId);
  const { data: members } = useTeamMembersQuery(teamId, 'APPROVED');
  const { data: reviews } = useTeamReviewsQuery(teamId);
  const joinTeam = useJoinTeamMutation();
  const startConversation = useStartConversationMutation();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);

  const handleJoin = () =>
    joinTeam.mutate(teamId, {
      onSuccess: () => showToast('Đã gửi yêu cầu tham gia CLB.'),
      onError: (joinError) => showAlert('Lỗi', joinError.message),
    });

  const handleChat = async () => {
    if (!team?.owner_id) return;
    try {
      const conversation = await startConversation.mutateAsync(team.owner_id);
      router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } });
    } catch (chatError) {
      showAlert('Lỗi', chatError instanceof Error ? chatError.message : 'Không mở được cuộc trò chuyện');
    }
  };

  const header = (
    <Pressable onPress={() => router.back()} hitSlop={8} className="mb-4 flex-row items-center gap-1.5 self-start">
      <ArrowLeft size={16} color="#94A3B8" />
      <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Khám phá CLB</Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <ScreenContainer className="pt-3">
        {header}
        <LoadingState label="Đang tải CLB…" />
      </ScreenContainer>
    );
  }

  if (isError || !team) {
    return (
      <ScreenContainer className="pt-3">
        {header}
        <Text className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {error instanceof Error ? error.message : 'Không tải được thông tin CLB.'}
        </Text>
      </ScreenContainer>
    );
  }

  const coverUri = resolveMediaUrl(team.image_url);
  const full = team.member_count >= team.total_slots;
  const pending = team.membership_status === 'PENDING';
  const ownerPremium = team.owner_is_premium;
  const canJoin = !team.is_captain && !team.is_member;
  const joinLabel = pending ? 'Đang chờ duyệt' : full ? 'CLB đã đủ người' : 'Tham gia CLB';

  return (
    <ScreenContainer className="gap-4 pt-3">
      {header}

      <View className="overflow-hidden rounded-3xl border border-border bg-white dark:border-border-dark dark:bg-[#111827]">
        {coverUri ? (
          <Pressable onPress={() => setCoverOpen(true)} accessibilityLabel={`Xem ảnh bìa CLB ${team.name}`}>
            <Image source={{ uri: coverUri }} style={{ width: '100%', height: 176 }} resizeMode="cover" />
          </Pressable>
        ) : null}
        <View className="gap-3 p-4">
          <Text className="text-[11px] font-extrabold uppercase tracking-widest text-brand dark:text-brand-dark">
            {team.sport_name || 'CỘNG ĐỒNG THỂ THAO'}
          </Text>
          <Text className="text-2xl font-black text-slate-900 dark:text-white">{team.name}</Text>
          <Text className="text-sm leading-5 text-slate-500 dark:text-slate-400">
            {team.description || 'Một cộng đồng dành cho những người yêu thể thao.'}
          </Text>

          <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
            <View className="flex-row items-center gap-1.5">
              <MapPin size={14} color="#F43F5E" />
              <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">{team.location}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Users size={14} color="#3B82F6" />
              <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {team.member_count} thành viên
              </Text>
            </View>
            {team.rating_count > 0 ? (
              <View className="flex-row items-center gap-1.5">
                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {team.rating.toFixed(1)} ({team.rating_count} đánh giá)
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row flex-wrap gap-2">
            {canJoin ? (
              <Button
                size="sm"
                disabled={pending || full}
                loading={joinTeam.isPending}
                onPress={handleJoin}
              >
                <Text className="text-xs font-bold text-white">{joinLabel}</Text>
              </Button>
            ) : null}
            {ownerPremium && (team.is_captain || team.is_member) ? (
              <Button variant="outline" size="sm" onPress={() => setPremiumOpen(true)}>
                <CalendarClock size={14} color="#8B5CF6" />
                <Text className="text-xs font-bold text-violet-600 dark:text-violet-300">
                  {team.is_captain ? 'Quản lý CLB' : 'Lịch CLB'}
                </Text>
              </Button>
            ) : null}
            {team.owner_id && !team.is_captain ? (
              <Button variant="outline" size="sm" loading={startConversation.isPending} onPress={handleChat}>
                <MessageCircle size={14} color="#537fff" />
                <Text className="text-xs font-bold text-brand dark:text-brand-dark">Nhắn tin</Text>
              </Button>
            ) : null}
          </View>
        </View>
      </View>

      <View className="gap-3 rounded-3xl border border-border bg-white p-4 dark:border-border-dark dark:bg-[#111827]">
        <Text className="text-base font-black text-slate-900 dark:text-white">Về câu lạc bộ</Text>
        <Text className="text-sm leading-5 text-slate-500 dark:text-slate-400">
          {team.description || 'CLB chưa thêm phần giới thiệu.'}
        </Text>
        {team.tags.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {team.tags.map((tag) => (
              <Text
                key={tag}
                className="rounded-lg bg-slate-500/10 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                #{tag}
              </Text>
            ))}
          </View>
        ) : null}
        <View className="flex-row items-center gap-3 border-t border-border pt-3 dark:border-border-dark">
          <Avatar
            uri={resolveMediaUrl(team.owner_avatar_url)}
            fallback={team.owner_name}
            size={ownerPremium ? 34 : 40}
            premium={ownerPremium}
          />
          <View className="flex-1">
            <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Người mở CLB</Text>
            <View className="flex-row items-center gap-1.5">
              <Text
                className={cn('text-sm font-black', ownerPremium ? 'text-[#8b8cff]' : 'text-slate-900 dark:text-white')}
                numberOfLines={1}
              >
                {team.owner_name}
              </Text>
              {ownerPremium ? <Crown size={12} color="#8b8cff" fill="#8b8cff" /> : null}
            </View>
          </View>
        </View>
      </View>

      <View className="gap-3 rounded-3xl border border-border bg-white p-4 dark:border-border-dark dark:bg-[#111827]">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-black text-slate-900 dark:text-white">Thành viên</Text>
          <Text className="text-xs font-bold text-slate-400">{team.member_count}</Text>
        </View>
        {members && members.length > 0 ? (
          members.slice(0, 9).map((person) => (
            <View key={person.id} className="flex-row items-center gap-3">
              <Avatar
                uri={resolveMediaUrl(person.avatar_url)}
                fallback={person.full_name || 'Người chơi'}
                size={person.is_premium ? 30 : 36}
                premium={person.is_premium}
              />
              <Text
                className={cn('flex-1 text-sm font-bold', person.is_premium ? 'text-[#8b8cff]' : 'text-slate-900 dark:text-white')}
                numberOfLines={1}
              >
                {person.full_name || 'Người chơi'}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {team.is_member || team.is_captain
              ? 'Chưa có thành viên được hiển thị.'
              : 'Tham gia CLB để xem danh sách thành viên.'}
          </Text>
        )}
      </View>

      <View className="gap-3 rounded-3xl border border-border bg-white p-4 dark:border-border-dark dark:bg-[#111827]">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-base font-black text-slate-900 dark:text-white">Đánh giá từ cộng đồng</Text>
          {!team.is_captain ? (
            <Button variant="outline" size="sm" onPress={() => setReviewOpen(true)}>
              <Star size={14} color="#D97706" />
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">Viết đánh giá</Text>
            </Button>
          ) : null}
        </View>
        {reviews && reviews.length > 0 ? (
          reviews.map((review) => (
            <View key={review.id} className="gap-1 border-t border-border pt-3 dark:border-border-dark">
              <View className="flex-row items-center gap-1">
                <Star size={13} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-xs font-black text-amber-600 dark:text-amber-400">{review.rating}/5</Text>
              </View>
              <Text className="text-sm text-slate-700 dark:text-slate-200">
                {review.comment || 'Thành viên đã đánh giá CLB này.'}
              </Text>
              <Text className="text-[11px] text-slate-400">
                {new Date(review.created_at).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            Chưa có đánh giá. Hãy chia sẻ trải nghiệm của bạn.
          </Text>
        )}
      </View>

      {reviewOpen ? <ReviewTeamModal visible teamId={teamId} onClose={() => setReviewOpen(false)} /> : null}
      {premiumOpen ? (
        <TeamPremiumSettingsModal visible team={team} canEdit={team.is_captain} onClose={() => setPremiumOpen(false)} />
      ) : null}
      {coverUri ? <ImageLightbox visible={coverOpen} uri={coverUri} onClose={() => setCoverOpen(false)} /> : null}
    </ScreenContainer>
  );
}
