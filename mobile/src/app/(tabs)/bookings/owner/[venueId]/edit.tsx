import { router, useLocalSearchParams } from 'expo-router';

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

  if (isLoading) {
    return (
      <ScreenContainer className="gap-4 pt-3">
        <LoadingState label="Đang tải thông tin sân…" />
      </ScreenContainer>
    );
  }

  if (!venue) {
    return (
      <ScreenContainer className="gap-4 pt-3">
        <EmptyState title="Không tìm thấy sân" description="Sân này có thể đã bị gỡ." />
      </ScreenContainer>
    );
  }

  return (
    <VenueForm
      initialVenue={venue}
      title="Setup Sân & Khung Giờ"
      subtitle="Cấu hình giá bán, số lượng sân con và dịch vụ đi kèm"
      submitLabel="Lưu & Kích Hoạt Sân"
      isSubmitting={updateVenue.isPending}
      onCancel={() => router.replace('/bookings')}
      onSubmit={async (data) => {
        await updateVenue.mutateAsync(data);
        router.replace('/bookings');
      }}
    />
  );
}
