import { ShieldCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PopupModal } from '@/components/ui/popup-modal';
import { Text } from '@/components/ui/text';

const RULES: { title: string; text: string }[] = [
  {
    title: 'Tôn trọng mọi người',
    text: 'Không xúc phạm, quấy rối, đe dọa hay phân biệt đối xử về giới tính, vùng miền, tôn giáo, ngoại hình hoặc trình độ chơi.',
  },
  {
    title: 'Không đăng nội dung phản cảm',
    text: 'Không đăng hình ảnh, video hay lời lẽ khiêu dâm, bạo lực, kích động thù ghét hoặc vi phạm pháp luật.',
  },
  {
    title: 'Không lừa đảo và spam',
    text: 'Không mạo danh, quảng cáo trái phép, kêu gọi chuyển tiền gây hiểu lầm hay đăng nội dung lặp lại gây nhiễu.',
  },
  {
    title: 'Bảo vệ quyền riêng tư',
    text: 'Không đăng số điện thoại, địa chỉ nhà, giấy tờ hoặc hình ảnh của người khác khi chưa được họ đồng ý.',
  },
  {
    title: 'Trung thực khi tạo phòng và CLB',
    text: 'Thông tin địa điểm, thời gian và chi phí cần chính xác. Hãy đến đúng hẹn hoặc báo trước nếu không tham gia được.',
  },
  {
    title: 'An toàn khi gặp mặt',
    text: 'Lần đầu gặp người chơi mới, nên chọn sân công cộng và báo cho người quen biết.',
  },
];

interface CommunityRulesModalProps {
  visible: boolean;
  onClose: () => void;
}

/** In-app community rules, opened from the sign-up form, the comment composer and the profile footer. */
export function CommunityRulesModal({ visible, onClose }: CommunityRulesModalProps) {
  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title="Quy tắc cộng đồng SportGo"
      subtitle="Cùng giữ SportGo vui, an toàn và tôn trọng."
      icon={ShieldCheck}
      iconColor="#059669"
      footer={
        <View className="flex-row justify-end">
          <Button label="Đã hiểu" onPress={onClose} />
        </View>
      }
    >
      <View className="gap-3.5">
        {RULES.map((rule, index) => (
          <View key={rule.title} className="flex-row gap-3">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-brand/10 dark:bg-brand-dark/15">
              <Text className="text-xs font-black text-brand dark:text-brand-dark">{index + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-900 dark:text-white">{rule.title}</Text>
              <Text className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{rule.text}</Text>
            </View>
          </View>
        ))}

        <View className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <Text className="text-xs font-bold text-slate-800 dark:text-slate-100">Khi có vi phạm</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Bạn có thể báo cáo bài viết, bình luận, người dùng, phòng hoặc CLB bằng nút Báo cáo, và chặn người gây phiền.
            Quản trị viên sẽ xem xét báo cáo. Nội dung vi phạm có thể bị gỡ, tài khoản có thể bị cảnh báo hoặc xóa nếu
            vi phạm nghiêm trọng.
          </Text>
        </View>
      </View>
    </PopupModal>
  );
}
