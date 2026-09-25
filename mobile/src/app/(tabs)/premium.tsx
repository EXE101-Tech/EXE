import { Crown } from 'lucide-react-native';

import { PlaceholderScreen } from '@/components/brand/placeholder-screen';

export default function PremiumScreen() {
  return (
    <PlaceholderScreen
      icon={Crown}
      title="Premium"
      description="Các gói nâng cấp và đặc quyền hội viên sẽ có ở giai đoạn tiếp theo."
    />
  );
}
