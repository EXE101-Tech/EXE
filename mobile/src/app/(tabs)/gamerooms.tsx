import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import { Award, CirclePlus, DollarSign, Gamepad2, MapPin, Sparkles, Trophy, UserRound, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { CreateGameroomModal } from '@/components/gamerooms/create-gameroom-modal';
import { GameroomCard } from '@/components/gamerooms/gameroom-card';
import { AutoSearchModal } from '@/components/gamerooms/auto-search-modal';
import { GameroomManageModal } from '@/components/gamerooms/gameroom-manage-modal';
import { JoinRoomModal } from '@/components/gamerooms/join-room-modal';
import { Button } from '@/components/ui/button';
import { FilterActionButton, FilterBar } from '@/components/ui/filter-bar';
import type { SelectOption } from '@/components/ui/select-dropdown';
import { useStartConversationMutation } from '@/hooks/queries/use-chat';
import { useSportsQuery } from '@/hooks/queries/use-courts';
import {
  useGameroomsQuery,
  useJoinGameroomMutation,
  useLeaveGameroomMutation,
  useMyGameroomsQuery,
  useRespondInviteMutation,
} from '@/hooks/queries/use-gamerooms';
import { isActiveSportName, LOCATION_FILTER_OPTIONS, SKILL_REQUIREMENT_OPTIONS, SPORT_KEY_BY_NAME } from '@/lib/constants';
import { parseStoredCostToVnd } from '@/lib/price';
import { createSportExperienceMap, sortBySportExperience } from '@/lib/sport-experience';
import type { MatchResponse } from '@/schemas/gamerooms';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/stores/toast-store';
import { showAlert } from '@/stores/dialog-store';

const SCOPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả phòng' },
  { value: 'mine', label: 'Phòng của tôi' },
];

const PRICE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả giá' },
  { value: 'Free', label: 'Miễn phí / Chia tiền sân' },
  { value: 'Dưới 50k', label: 'Dưới 50.000đ' },
  { value: '50k - 100k', label: '50.000đ - 100.000đ' },
  { value: 'Trên 100k', label: 'Trên 100.000đ' },
];

const SKILL_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả trình độ' },
  ...SKILL_REQUIREMENT_OPTIONS,
];

const CLOSED_STATUSES = ['CLOSED', 'CANCELLED', 'FINISHED'];

export default function GameroomsScreen() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isPremium = useAuthStore((s) => s.user?.isPremium ?? false);
  const userSports = useAuthStore((s) => s.user?.sports);
  const params = useLocalSearchParams<{ search?: string; sport?: string }>();
  const searchTerm = (params.search ?? '').trim().toLowerCase();

  const [sportFilter, setSportFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');

  // Phong cua toi reads /gamerooms/mine so finished rooms stay reachable for attendance and cleanup.
  const showMine = scopeFilter === 'mine';
  const allRoomsQuery = useGameroomsQuery();
  const myRoomsQuery = useMyGameroomsQuery(showMine);
  const { data: rooms, isLoading, isError, refetch, isRefetching } = showMine ? myRoomsQuery : allRoomsQuery;
  const { data: sports } = useSportsQuery();
  const joinRoom = useJoinGameroomMutation();
  const leaveRoom = useLeaveGameroomMutation();
  const respondInvite = useRespondInviteMutation();
  const startConversation = useStartConversationMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MatchResponse | null>(null);
  const [isAutoSearchOpen, setIsAutoSearchOpen] = useState(false);
  const [managingRoomId, setManagingRoomId] = useState<number | null>(null);
  const [joiningRoom, setJoiningRoom] = useState<MatchResponse | null>(null);

  // ?sport=<key> comes from the search screen; picking a sport in the dropdown overrides it.
  const routeSportId = params.sport
    ? (sports ?? []).find((s) => SPORT_KEY_BY_NAME[s.name.trim().toLowerCase()] === params.sport)?.id
    : undefined;
  const activeSportFilter = routeSportId != null ? String(routeSportId) : sportFilter;
  const handleSportChange = (value: string) => {
    setSportFilter(value);
    if (params.sport) router.setParams({ sport: undefined });
  };

  const sportOptions: SelectOption[] = useMemo(
    () => [
      { value: 'all', label: 'Tất cả môn' },
      ...(sports ?? []).filter((s) => s.id != null && isActiveSportName(s.name)).map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [sports],
  );

  const isFiltered =
    activeSportFilter !== 'all' ||
    scopeFilter !== 'all' ||
    locationFilter !== 'all' ||
    priceFilter !== 'all' ||
    skillFilter !== 'all';

  const activeFilterCount = [activeSportFilter, scopeFilter, locationFilter, priceFilter, skillFilter].filter(
    (value) => value !== 'all',
  ).length;

  const resetFilters = () => {
    setSportFilter('all');
    if (params.sport) router.setParams({ sport: undefined });
    setScopeFilter('all');
    setLocationFilter('all');
    setPriceFilter('all');
    setSkillFilter('all');
  };

  const filteredRooms = useMemo(() => {
    const visibleRooms = (rooms ?? []).filter((room) => {
      if (!isActiveSportName(room.sport.name)) return false;
      if (!showMine && CLOSED_STATUSES.includes(room.status)) return false;
      if (searchTerm) {
        const hostName = room.host.profile?.full_name || room.host.email;
        return [room.title, room.location, hostName, room.description].some((value) =>
          value?.toLowerCase().includes(searchTerm),
        );
      }
      if (activeSportFilter !== 'all' && room.sport_id !== Number(activeSportFilter)) return false;
      if (scopeFilter === 'mine' && room.host_id !== currentUserId) return false;
      const location = room.location || room.court?.venue?.name || room.court?.venue?.address || '';
      if (locationFilter !== 'all' && !location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (priceFilter !== 'all') {
        const roomPrice = parseStoredCostToVnd(room.price_info);
        if (roomPrice === null) return false;
        if (priceFilter === 'Free' && roomPrice !== 0) return false;
        if (priceFilter === 'Dưới 50k' && (roomPrice === 0 || roomPrice >= 50000)) return false;
        if (priceFilter === '50k - 100k' && (roomPrice < 50000 || roomPrice > 100000)) return false;
        if (priceFilter === 'Trên 100k' && roomPrice <= 100000) return false;
      }
      if (skillFilter !== 'all' && room.required_level !== skillFilter) return false;
      return true;
    });
    // Sports the viewer plays at a higher level come first; Premium priority rooms lead within a tier.
    return sortBySportExperience(visibleRooms, createSportExperienceMap(userSports), (room) => room.sport.name);
  }, [rooms, activeSportFilter, searchTerm, scopeFilter, showMine, locationFilter, priceFilter, skillFilter, currentUserId, userSports]);

  const handleChat = async (hostId: number) => {
    try {
      const conversation = await startConversation.mutateAsync(hostId);
      router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } });
    } catch (error) {
      showAlert('Lỗi', error instanceof Error ? error.message : 'Không mở được cuộc trò chuyện');
    }
  };

  const openAutoSearch = () => {
    if (!isPremium) {
      showAlert('Tính năng Premium', 'Tự động tìm phòng là tính năng dành cho tài khoản Premium.', [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Xem Premium', onPress: () => router.push('/(tabs)/premium') },
      ]);
      return;
    }
    setIsAutoSearchOpen(true);
  };

  const handleEditRoom = (room: MatchResponse) => {
    setManagingRoomId(null);
    setEditingRoom(room);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setEditingRoom(null);
  };

  const confirmJoin = (note: string) => {
    if (!joiningRoom) return;
    joinRoom.mutate(
      { id: joiningRoom.id, note },
      {
        onSuccess: () => {
          setJoiningRoom(null);
          showToast('Đã gửi yêu cầu tham gia phòng.');
        },
        onError: (e) => showAlert('Lỗi', e.message),
      },
    );
  };

  const respond = (id: number, action: 'ACCEPT' | 'REJECT') =>
    respondInvite.mutate(
      { id, action },
      {
        onSuccess: () => showToast(action === 'ACCEPT' ? 'Đã nhận lời mời vào phòng.' : 'Đã từ chối lời mời tự động.'),
        onError: (e) => showAlert('Lỗi', e.message),
      },
    );

  return (
    <ScreenContainer scroll={false} className="px-4">
      <TopNavbar />

      <Text className="mb-3 text-xl font-black text-slate-900 dark:text-white">Phòng chờ thi đấu</Text>

      {searchTerm ? (
        <View className="mb-3 flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 dark:border-border-dark dark:bg-[#111827]">
          <Text className="flex-1 text-sm text-slate-600 dark:text-slate-300" numberOfLines={1}>
            Kết quả phòng cho <Text className="font-black">“{params.search}”</Text>
          </Text>
          <TouchableOpacity hitSlop={8} accessibilityLabel="Xóa tìm kiếm" onPress={() => router.setParams({ search: undefined })}>
            <X size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      ) : null}

      <FilterBar
        activeCount={activeFilterCount}
        actions={
          <>
            <FilterActionButton label="Thiết lập" icon={Sparkles} tone="violet" onPress={openAutoSearch} />
            <FilterActionButton
              label="Mở phòng"
              icon={CirclePlus}
              onPress={() => {
                setEditingRoom(null);
                setIsCreateOpen(true);
              }}
            />
          </>
        }
        items={[
          { icon: Trophy, iconColor: '#F59E0B', value: activeSportFilter, options: sportOptions, onChange: handleSportChange },
          { icon: UserRound, iconColor: '#8B5CF6', value: scopeFilter, options: SCOPE_OPTIONS, onChange: setScopeFilter },
          { icon: MapPin, iconColor: '#F43F5E', value: locationFilter, options: LOCATION_FILTER_OPTIONS, onChange: setLocationFilter },
          { icon: DollarSign, iconColor: '#F59E0B', value: priceFilter, options: PRICE_OPTIONS, onChange: setPriceFilter },
          { icon: Award, iconColor: '#059669', value: skillFilter, options: SKILL_OPTIONS, onChange: setSkillFilter },
        ]}
      />

      {isLoading ? (
        <LoadingState label="Đang tải phòng chờ…" />
      ) : isError ? (
        <EmptyState icon={Gamepad2} title="Không tải được phòng chờ" description="Kéo để tải lại." />
      ) : (
        <FlatList
          className="flex-1"
          data={filteredRooms}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-3 pb-8"
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <GameroomCard
              room={item}
              currentUserId={currentUserId}
              isJoining={joinRoom.isPending && joinRoom.variables?.id === item.id}
              isLeaving={leaveRoom.isPending && leaveRoom.variables === item.id}
              isResponding={respondInvite.isPending && respondInvite.variables?.id === item.id}
              onAcceptInvite={() => respond(item.id, 'ACCEPT')}
              onDeclineInvite={() => respond(item.id, 'REJECT')}
              onJoin={() => setJoiningRoom(item)}
              onLeave={() => leaveRoom.mutate(item.id, { onError: (e) => showAlert('Lỗi', e.message) })}
              onManage={() => setManagingRoomId(item.id)}
              onChat={() => handleChat(item.host_id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Gamepad2}
              title={isFiltered ? 'Không tìm thấy phòng chờ phù hợp' : 'Chưa có phòng chờ nào'}
              description={isFiltered ? 'Thử đổi bộ lọc để xem thêm phòng.' : 'Hãy mở phòng để tìm bạn chơi.'}
            />
          }
          ListFooterComponent={
            isFiltered && filteredRooms.length === 0 ? (
              <Button variant="outline" size="sm" label="Xóa bộ lọc" onPress={resetFilters} className="mt-3 self-center" />
            ) : null
          }
        />
      )}

      {joiningRoom ? (
        <JoinRoomModal
          room={joiningRoom}
          isLoading={joinRoom.isPending}
          onClose={() => setJoiningRoom(null)}
          onConfirm={confirmJoin}
        />
      ) : null}
      <CreateGameroomModal visible={isCreateOpen} room={editingRoom} onClose={closeCreateModal} />
      <AutoSearchModal
        visible={isAutoSearchOpen}
        onClose={() => setIsAutoSearchOpen(false)}
        onSaved={() => showToast('Đã lưu thiết lập tự động tìm phòng. Bạn sẽ nhận thông báo khi có phòng phù hợp.')}
      />
      {managingRoomId != null ? (
        <GameroomManageModal
          visible
          roomId={managingRoomId}
          onClose={() => setManagingRoomId(null)}
          onEdit={handleEditRoom}
        />
      ) : null}
    </ScreenContainer>
  );
}
