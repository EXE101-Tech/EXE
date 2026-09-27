import { Crown } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';

export default function PremiumScreen() {
  return (
    <ScreenContainer scroll={false} className="px-4">
      <TopNavbar />
      <View className="flex-1 items-center justify-center gap-4 px-2">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/15">
          <Crown size={28} color="#B45309" />
        </View>
        <Text className="text-xl font-black text-slate-900 dark:text-white">SportGo Premium</Text>
        <Text className="text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
          Gói Premium và thanh toán chưa được kết nối. Hiện chưa thể đăng ký hoặc thu phí; màn hình này chỉ cung
          cấp thông tin và sẽ không tạo giao dịch.
        </Text>
      </View>
    </ScreenContainer>
  );
}
