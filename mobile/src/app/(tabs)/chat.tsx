import { MessageCircle } from 'lucide-react-native';

import { PlaceholderScreen } from '@/components/brand/placeholder-screen';

export default function ChatScreen() {
  return (
    <PlaceholderScreen
      icon={MessageCircle}
      title="Chat"
      description="Nhắn tin trực tiếp với đối thủ và chủ sân sẽ có ở giai đoạn tiếp theo."
    />
  );
}
