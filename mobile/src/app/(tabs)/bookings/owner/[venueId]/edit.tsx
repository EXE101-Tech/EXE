import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { VenueForm } from '@/components/owner/venue-form';
import { useOwnerVenuesQuery, useUpdateVenueMutation } from '@/hooks/queries/use-owner-venues';

export default function EditVenueScreen() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const id = Number(venueId);

  const { data: venues, isLoading } = useOwnerVenuesQuery();
  const venue = venues?.find((v) => v.id === id);
  const updateVenue = useUpdateVenueMutation(id);

  return (
    <ScreenContainer className="gap-4 pt-3">
      <Pressable onPress={() => router.back()} hitSlop={8} className="flex-row items-center gap-2 self-start">
        <ArrowLeft size={20} color="#94A3B8" />
        <Text className="text-base font-bold text-slate-700 dark:text-slate-200">Quay lại</Text>
      </Pressable>
      <Text className="text-2xl font-black text-slate-900 dark:text-white">Chỉnh sửa sân</Text>

      {isLoading ? (
        <LoadingState label="Đang tải thông tin sân…" />
      ) : !venue ? (
        <EmptyState title="Không tìm thấy sân" description="Sân này có thể đã bị gỡ." />
      ) : (
        <VenueForm
          initialVenue={venue}
          submitLabel="Lưu thay đổi"
          isSubmitting={updateVenue.isPending}
          onSubmit={async (data) => {
            await updateVenue.mutateAsync(data);
            router.back();
          }}
        />
      )}
    </ScreenContainer>
  );
}
