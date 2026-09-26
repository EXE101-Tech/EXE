import { router } from 'expo-router';
import { Award, Calendar, DollarSign, Gamepad2, MapPin, Plus, Trophy, UserRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { CreateGameroomModal } from '@/components/gamerooms/create-gameroom-modal';
import { GameroomCard } from '@/components/gamerooms/gameroom-card';
import { GameroomParticipantsModal } from '@/components/gamerooms/gameroom-participants-modal';
import { Button } from '@/components/ui/button';
import { FilterGrid } from '@/components/ui/filter-grid';
import type { SelectOption } from '@/components/ui/select-dropdown';
import { useStartConversationMutation } from '@/hooks/queries/use-chat';
import { useSportsQuery } from '@/hooks/queries/use-courts';
import { useGameroomsQuery, useJoinGameroomMutation, useLeaveGameroomMutation } from '@/hooks/queries/use-gamerooms';
import { SKILL_REQUIREMENT_OPTIONS } from '@/lib/constants';
import { parseStoredCostToVnd } from '@/lib/price';
import { getVietnamDate } from '@/lib/slots';
import { useAuthStore } from '@/stores/auth-store';

const SCOPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả phòng' },
  { value: 'mine', label: 'Phòng của tôi' },
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
  { value: 'Free', label: 'Miễn phí / Chia tiền sân' },
  { value: 'Dưới 50k', label: 'Dưới 50.000đ' },
  { value: '50k - 100k', label: '50.000đ - 100.000đ' },
  { value: 'Trên 100k', label: 'Trên 100.000đ' },
];

const SKILL_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả trình độ' },
  ...SKILL_REQUIREMENT_OPTIONS,
];

/** Buckets a room's start time into the same "Tối nay / Chiều / Sáng Chủ Nhật…" labels as the filter options. */
function matchesTimeFilter(startTimeIso: string, filter: string): boolean {
  if (filter === 'all') return true;
  const withZ = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(startTimeIso) ? startTimeIso : `${startTimeIso}Z`;
  const date = new Date(withZ);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(date),
  );
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' }).format(date);
  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);

  switch (filter) {
    case 'Tối nay':
      return dateKey === getVietnamDate() && hour >= 18;
    case 'Tối mai':
      return dateKey === getVietnamDate(1) && hour >= 18;
    case 'Chiều':
      return hour >= 12 && hour < 18;
    case 'Sáng':
      return weekday === 'Sun' && hour < 12;
    case 'Thứ 6':
      return weekday === 'Fri' && hour >= 18;
    default:
      return true;
  }
}

export default function GameroomsScreen() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: rooms, isLoading, isError, refetch, isRefetching } = useGameroomsQuery();
  const { data: sports } = useSportsQuery();
  const joinRoom = useJoinGameroomMutation();
  const leaveRoom = useLeaveGameroomMutation();
  const startConversation = useStartConversationMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [managingRoomId, setManagingRoomId] = useState<number | null>(null);

  const [sportFilter, setSportFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');

  const sportOptions: SelectOption[] = useMemo(
    () => [
      { value: 'all', label: 'Tất cả môn' },
      ...(sports ?? []).filter((s) => s.id != null).map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [sports],
  );

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

  const filteredRooms = useMemo(() => {
    return (rooms ?? []).filter((room) => {
      if (sportFilter !== 'all' && room.sport_id !== Number(sportFilter)) return false;
      if (scopeFilter === 'mine' && room.host_id !== currentUserId) return false;
      const location = room.location || room.court?.venue?.name || room.court?.venue?.address || '';
      if (locationFilter !== 'all' && !location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (!matchesTimeFilter(room.start_time, timeFilter)) return false;
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
  }, [rooms, sportFilter, scopeFilter, locationFilter, timeFilter, priceFilter, skillFilter, currentUserId]);

  const handleChat = async (hostId: number) => {
    try {
      const conversation = await startConversation.mutateAsync(hostId);
      router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } });
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không mở được cuộc trò chuyện');
    }
  };

  return (
    <ScreenContainer scroll={false} className="px-4">
      <TopNavbar />

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xl font-black text-slate-900 dark:text-white">Phòng chờ thi đấu</Text>
        <TouchableOpacity
          onPress={() => setIsCreateOpen(true)}
          className="h-9 w-9 items-center justify-center rounded-full bg-brand dark:bg-brand-dark"
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <FilterGrid
        items={[
          { icon: Trophy, iconColor: '#F59E0B', value: sportFilter, options: sportOptions, onChange: setSportFilter },
          { icon: UserRound, iconColor: '#8B5CF6', value: scopeFilter, options: SCOPE_OPTIONS, onChange: setScopeFilter },
          { icon: MapPin, iconColor: '#F43F5E', value: locationFilter, options: LOCATION_OPTIONS, onChange: setLocationFilter },
          { icon: Calendar, iconColor: '#3B82F6', value: timeFilter, options: TIME_OPTIONS, onChange: setTimeFilter },
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
              onJoin={() => joinRoom.mutate({ id: item.id }, { onError: (e) => Alert.alert('Lỗi', e.message) })}
              onLeave={() => leaveRoom.mutate(item.id, { onError: (e) => Alert.alert('Lỗi', e.message) })}
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

      <CreateGameroomModal visible={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      {managingRoomId != null ? (
        <GameroomParticipantsModal visible roomId={managingRoomId} onClose={() => setManagingRoomId(null)} />
      ) : null}
    </ScreenContainer>
  );
}
