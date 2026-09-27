import { router } from 'expo-router';
import { Award, Calendar, DollarSign, MapPin, MessageSquare, Plus, Trophy, UserRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { CreateLfgPostModal } from '@/components/lfg/create-lfg-post-modal';
import { LfgParticipantsModal } from '@/components/lfg/lfg-participants-modal';
import { LfgPostCard } from '@/components/lfg/lfg-post-card';
import { FilterGrid } from '@/components/ui/filter-grid';
import { Button } from '@/components/ui/button';
import type { SelectOption } from '@/components/ui/select-dropdown';
import { useStartConversationMutation } from '@/hooks/queries/use-chat';
import {
  useCancelLfgPostMutation,
  useJoinLfgPostMutation,
  useLeaveLfgPostMutation,
  useLfgPostsQuery,
} from '@/hooks/queries/use-lfg';
import { SPORTS } from '@/lib/constants';
import { parseStoredCostToVnd } from '@/lib/price';
import type { LfgPostResponse } from '@/schemas/lfg';
import { useAuthStore } from '@/stores/auth-store';

const SPORT_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả môn' },
  ...SPORTS.map((sport) => ({ value: sport.key, label: sport.name, emoji: sport.emoji })),
];

const SCOPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả bài' },
  { value: 'mine', label: 'Bài của tôi' },
];

const LOCATION_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả khu vực' },
  { value: 'Quận 10', label: 'Quận 10' },
  { value: 'Quận 7', label: 'Quận 7' },
  { value: 'Thủ Đức', label: 'TP. Thủ Đức' },
  { value: 'Quận 11', label: 'Quận 11' },
  { value: 'Quận 3', label: 'Quận 3' },
];

const TIME_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả giờ' },
  { value: 'Tối nay', label: 'Tối nay' },
  { value: 'Tối mai', label: 'Tối mai' },
  { value: 'Chiều', label: 'Chiều nay' },
  { value: 'Sáng', label: 'Sáng Chủ Nhật' },
  { value: 'Thứ 6', label: 'Tối Thứ 6' },
];

const PRICE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả giá' },
  { value: 'Dưới 60k', label: 'Dưới 60.000đ' },
  { value: '60k - 80k', label: '60.000đ - 80.000đ' },
  { value: 'Trên 80k', label: 'Trên 80.000đ' },
];

const SKILL_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả trình độ' },
  { value: 'Mới chơi', label: 'Mới chơi / Vui vẻ' },
  { value: 'Trung bình yếu', label: 'Trung bình yếu' },
  { value: 'Trung bình', label: 'Trung bình' },
  { value: 'Khá', label: 'Khá / Nâng cao' },
];

export default function ForumScreen() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: posts, isLoading, isError, refetch, isRefetching } = useLfgPostsQuery();
  const joinPost = useJoinLfgPostMutation();
  const leavePost = useLeaveLfgPostMutation();
  const cancelPost = useCancelLfgPostMutation();
  const startConversation = useStartConversationMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<LfgPostResponse | null>(null);
  const [managingPostId, setManagingPostId] = useState<number | null>(null);

  const [sportFilter, setSportFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');

  const isFiltered =
    sportFilter !== 'all' ||
    scopeFilter !== 'all' ||
    locationFilter !== 'all' ||
    timeFilter !== 'all' ||
    priceFilter !== 'all' ||
    skillFilter !== 'all';

  const resetFilters = () => {
    setSportFilter('all');
    setScopeFilter('all');
    setLocationFilter('all');
    setTimeFilter('all');
    setPriceFilter('all');
    setSkillFilter('all');
  };

  const filteredPosts = useMemo(() => {
    return (posts ?? []).filter((post) => {
      if (sportFilter !== 'all' && post.sport_id !== sportFilter) return false;
      if (scopeFilter === 'mine' && post.author_id !== currentUserId) return false;
      if (locationFilter !== 'all' && !post.location.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
      if (
        timeFilter !== 'all' &&
        !post.date_label.toLowerCase().includes(timeFilter.toLowerCase()) &&
        !post.time_slot.toLowerCase().includes(timeFilter.toLowerCase())
      ) {
        return false;
      }
      if (priceFilter !== 'all') {
        const priceVnd = parseStoredCostToVnd(post.price ?? post.price_info);
        if (priceVnd === null) return false;
        if (priceFilter === 'Dưới 60k' && priceVnd >= 60000) return false;
        if (priceFilter === '60k - 80k' && (priceVnd < 60000 || priceVnd > 80000)) return false;
        if (priceFilter === 'Trên 80k' && priceVnd <= 80000) return false;
      }
      if (skillFilter !== 'all' && !post.skill_level.toLowerCase().includes(skillFilter.toLowerCase())) return false;
      return true;
    });
  }, [posts, sportFilter, scopeFilter, locationFilter, timeFilter, priceFilter, skillFilter, currentUserId]);

  const handleChat = async (authorId: number) => {
    try {
      const conversation = await startConversation.mutateAsync(authorId);
      router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } });
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không mở được cuộc trò chuyện');
    }
  };

  const handleCancel = (id: number) => {
    Alert.alert('Xóa bài đăng', 'Bạn có chắc muốn xóa bài tìm người chơi này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => cancelPost.mutate(id, { onError: (e) => Alert.alert('Lỗi', e.message) }),
      },
    ]);
  };

  return (
    <ScreenContainer scroll={false} className="px-4">
      <TopNavbar />

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xl font-black text-slate-900 dark:text-white">Diễn đàn tìm đối</Text>
        <TouchableOpacity
          onPress={() => setIsCreateOpen(true)}
          className="flex-row items-center gap-1 rounded-full bg-brand px-3 py-2 dark:bg-brand-dark"
        >
          <Plus size={16} color="#fff" />
          <Text className="text-xs font-bold text-white">Đăng bài</Text>
        </TouchableOpacity>
      </View>

      <FilterGrid
        items={[
          { icon: Trophy, iconColor: '#F59E0B', value: sportFilter, options: SPORT_OPTIONS, onChange: setSportFilter },
          { icon: UserRound, iconColor: '#8B5CF6', value: scopeFilter, options: SCOPE_OPTIONS, onChange: setScopeFilter },
          { icon: MapPin, iconColor: '#F43F5E', value: locationFilter, options: LOCATION_OPTIONS, onChange: setLocationFilter },
          { icon: Calendar, iconColor: '#3B82F6', value: timeFilter, options: TIME_OPTIONS, onChange: setTimeFilter },
          { icon: DollarSign, iconColor: '#F59E0B', value: priceFilter, options: PRICE_OPTIONS, onChange: setPriceFilter },
          { icon: Award, iconColor: '#059669', value: skillFilter, options: SKILL_OPTIONS, onChange: setSkillFilter },
        ]}
      />

      {isLoading ? (
        <LoadingState label="Đang tải bài đăng…" />
      ) : isError ? (
        <EmptyState icon={MessageSquare} title="Không tải được diễn đàn" description="Kéo để tải lại." />
      ) : (
        <FlatList
          className="flex-1"
          data={filteredPosts}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-3 pb-8"
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <LfgPostCard
              post={item}
              isOwner={item.author_id === currentUserId}
              isJoining={joinPost.isPending && joinPost.variables === item.id}
              isLeaving={leavePost.isPending && leavePost.variables === item.id}
              isCancelling={cancelPost.isPending && cancelPost.variables === item.id}
              onJoin={() => joinPost.mutate(item.id, { onError: (e) => Alert.alert('Lỗi', e.message) })}
              onLeave={() => leavePost.mutate(item.id, { onError: (e) => Alert.alert('Lỗi', e.message) })}
              onManage={() => setManagingPostId(item.id)}
              onEdit={() => setEditingPost(item)}
              onCancel={() => handleCancel(item.id)}
              onChat={() => handleChat(item.author_id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={MessageSquare}
              title={isFiltered ? 'Không tìm thấy bài đăng phù hợp' : 'Chưa có bài đăng nào'}
              description={
                isFiltered ? 'Thử đổi bộ lọc để xem thêm kèo.' : 'Hãy là người đầu tiên đăng tìm người chơi.'
              }
            />
          }
          ListFooterComponent={
            isFiltered && filteredPosts.length === 0 ? (
              <Button variant="outline" size="sm" label="Xóa bộ lọc" onPress={resetFilters} className="mt-3 self-center" />
            ) : null
          }
        />
      )}

      <CreateLfgPostModal visible={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      {editingPost ? (
        <CreateLfgPostModal visible post={editingPost} onClose={() => setEditingPost(null)} />
      ) : null}
      {managingPostId != null ? (
        <LfgParticipantsModal
          visible
          postId={managingPostId}
          onClose={() => setManagingPostId(null)}
        />
      ) : null}
    </ScreenContainer>
  );
}
