import { router } from 'expo-router';
import { Calendar, MapPin, PlusCircle, Search, Trophy } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { GradientButton } from '@/components/brand/gradient-button';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { Button } from '@/components/ui/button';
import { SelectDropdown, type SelectOption } from '@/components/ui/select-dropdown';
import { VenueCard } from '@/components/courts/venue-card';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { useOwnerRegistrationMutation, useOwnerStatusQuery } from '@/hooks/queries/use-auth';
import { useVenuesQuery } from '@/hooks/queries/use-courts';
import { useRemoveVenueMutation } from '@/hooks/queries/use-owner-venues';
import { SPORTS } from '@/lib/constants';
import type { VenueResponse } from '@/schemas/courts';
import { useAuthStore } from '@/stores/auth-store';

const SPORT_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả môn' },
  ...SPORTS.map((sport) => ({ value: sport.key, label: sport.name, emoji: sport.emoji })),
];

const LOCATION_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả khu vực' },
  { value: 'Quận 10', label: 'Quận 10' },
  { value: 'Quận 7', label: 'Quận 7' },
  { value: 'Thủ Đức', label: 'TP. Thủ Đức' },
  { value: 'Quận 11', label: 'Quận 11' },
  { value: 'Quận 3', label: 'Quận 3' },
  { value: 'Tân Bình', label: 'Quận Tân Bình' },
];

export default function BookingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: venues, isLoading, isError, refetch, isRefetching } = useVenuesQuery();
  const { data: ownerStatus } = useOwnerStatusQuery();
  const registerAsOwner = useOwnerRegistrationMutation();
  const removeVenue = useRemoveVenueMutation();

  const [sportFilter, setSportFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const isOwner = ownerStatus?.owner_status === 'registered';

  const filteredVenues = useMemo(() => {
    return (venues ?? []).filter((venue) => {
      if (scope === 'mine' && venue.owner_id !== user?.id) return false;
      if (sportFilter !== 'all' && venue.sport_key !== sportFilter) return false;
      if (locationFilter !== 'all' && !venue.address.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [venues, scope, sportFilter, locationFilter, user?.id]);

  const handleAddVenuePress = () => {
    if (isOwner) {
      router.push('/(tabs)/bookings/owner/new');
    } else {
      setIsTermsOpen(true);
    }
  };

  const handleAgreeTerms = async () => {
    try {
      await registerAsOwner.mutateAsync();
      setIsTermsOpen(false);
      router.push('/(tabs)/bookings/owner/new');
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể đăng ký chủ sân');
    }
  };

  const handleDeleteVenue = (venue: VenueResponse) => {
    Alert.alert('Xóa sân', `Bạn có chắc muốn gỡ ${venue.name} khỏi danh sách?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => removeVenue.mutate(venue.id, { onError: (e) => Alert.alert('Lỗi', e.message) }),
      },
    ]);
  };

  return (
    <ScreenContainer scroll={false} className="pt-3">
      <TopNavbar />
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <Text className="text-2xl font-black text-slate-900 dark:text-white">Đặt sân</Text>
        <View className="flex-row gap-2">
          <Button variant="outline" size="icon" onPress={() => router.push('/(tabs)/bookings/my')}>
            <Calendar size={16} color="#059669" />
          </Button>
          <TouchableOpacity
            onPress={handleAddVenuePress}
            className="flex-row items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2"
          >
            <PlusCircle size={16} color="#fff" />
            <Text className="text-xs font-bold text-white">{isOwner ? 'Thêm sân' : 'Đăng ký chủ sân'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="mb-3 flex-row gap-2">
        <SelectDropdown
          icon={Trophy}
          iconColor="#F59E0B"
          value={sportFilter}
          options={SPORT_OPTIONS}
          onChange={setSportFilter}
          className="flex-1"
        />
        <SelectDropdown
          icon={MapPin}
          iconColor="#F43F5E"
          value={locationFilter}
          options={LOCATION_OPTIONS}
          onChange={setLocationFilter}
          className="flex-1"
        />
      </View>

      {isOwner ? (
        <View className="mb-3 flex-row rounded-xl bg-slate-100 p-1 dark:bg-white/10">
          {(['all', 'mine'] as const).map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => setScope(value)}
              className={`flex-1 rounded-lg py-2 ${scope === value ? 'bg-white dark:bg-[#0F1E36]' : ''}`}
            >
              <Text
                className={`text-center text-xs font-bold ${scope === value ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {value === 'all' ? 'Toàn bộ sân' : 'Sân của tôi'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {isLoading ? (
        <LoadingState label="Đang tải danh sách sân…" />
      ) : isError ? (
        <EmptyState icon={Trophy} title="Không tải được danh sách sân" description="Kéo để tải lại." />
      ) : (
        <FlatList
          className="flex-1"
          data={filteredVenues}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-3 pb-8"
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <VenueCard
              venue={item}
              isOwnedByUser={item.owner_id === user?.id}
              onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: String(item.id) } })}
              onEdit={() =>
                router.push({ pathname: '/bookings/owner/[venueId]/edit', params: { venueId: String(item.id) } })
              }
              onSchedule={() =>
                router.push({ pathname: '/bookings/owner/[venueId]/schedule', params: { venueId: String(item.id) } })
              }
              onDelete={() => handleDeleteVenue(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Search}
              title="Không tìm thấy sân phù hợp"
              description="Thử đổi bộ lọc môn thể thao hoặc khu vực."
            />
          }
        />
      )}

      <Modal visible={isTermsOpen} transparent animationType="fade" onRequestClose={() => setIsTermsOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full gap-4 rounded-2xl bg-white p-5 dark:bg-[#0F1E36]">
            <Text className="text-lg font-black text-slate-900 dark:text-white">Đăng ký chủ sân</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              Bằng việc đăng ký, bạn xác nhận là chủ sở hữu hoặc người quản lý hợp pháp của sân thể thao và đồng ý cung
              cấp thông tin chính xác về sân, giá và lịch trống.
            </Text>
            <View className="flex-row justify-end gap-2.5">
              <Button variant="outline" label="Hủy" onPress={() => setIsTermsOpen(false)} />
              <GradientButton label="Tôi đồng ý" loading={registerAsOwner.isPending} onPress={handleAgreeTerms} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
