import { MessageSquare } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';

export default function ForumScreen() {
  return (
    <ScreenContainer scroll={false} className="px-4">
      <TopNavbar />
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={MessageSquare}
          title="Diễn đàn"
          description="Bảng tin cộng đồng, tìm đối và tìm nhóm sẽ có ở giai đoạn tiếp theo."
        />
      </View>
    </ScreenContainer>
  );
}
