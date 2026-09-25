import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { ScreenContainer } from '@/components/brand/screen-container';
import { VenueForm } from '@/components/owner/venue-form';
import { useCreateVenueMutation } from '@/hooks/queries/use-owner-venues';

export default function NewVenueScreen() {
  const createVenue = useCreateVenueMutation();

  return (
    <ScreenContainer className="gap-4 pt-3">
      <Pressable onPress={() => router.back()} hitSlop={8} className="flex-row items-center gap-2 self-start">
        <ArrowLeft size={20} color="#94A3B8" />
        <Text className="text-base font-bold text-slate-700 dark:text-slate-200">Quay lại</Text>
      </Pressable>
      <Text className="text-2xl font-black text-slate-900 dark:text-white">Thêm sân mới</Text>

      <VenueForm
        submitLabel="Tạo sân"
        isSubmitting={createVenue.isPending}
        onSubmit={async (data) => {
          await createVenue.mutateAsync(data);
          router.back();
        }}
      />
    </ScreenContainer>
  );
}
