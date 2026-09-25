import { Gamepad2 } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';

export default function GameroomsScreen() {
  return (
    <ScreenContainer scroll={false} className="px-4">
      <TopNavbar />
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={Gamepad2}
          title="Phòng game"
          description="Sảnh chờ thi đấu theo phòng sẽ có ở giai đoạn tiếp theo."
        />
      </View>
    </ScreenContainer>
  );
}
