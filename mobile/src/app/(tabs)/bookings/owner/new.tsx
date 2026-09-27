import { router } from 'expo-router';

import { VenueForm } from '@/components/owner/venue-form';
import { useCreateVenueMutation } from '@/hooks/queries/use-owner-venues';

export default function NewVenueScreen() {
  const createVenue = useCreateVenueMutation();

  return (
    <VenueForm
      title="Setup Sân & Khung Giờ"
      subtitle="Cấu hình giá bán, số lượng sân con và dịch vụ đi kèm"
      submitLabel="Tạo & Kích Hoạt Sân"
      isSubmitting={createVenue.isPending}
      onCancel={() => router.replace('/bookings')}
      onSubmit={async (data) => {
        await createVenue.mutateAsync(data);
        router.replace('/bookings');
      }}
    />
  );
}
