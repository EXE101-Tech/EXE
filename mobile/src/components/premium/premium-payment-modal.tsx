import { Text } from '@/components/ui/text';
import { Crown, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, View } from 'react-native';

const PAYMENT_NOTICE = 'Thanh toán trên mobile sẽ sớm được cập nhật, mời bạn truy cập trang web của SportGo để thực hiện giao dịch.';

interface PremiumPaymentModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PremiumPaymentModal({ visible, onClose }: PremiumPaymentModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-4 py-6">
        <Pressable accessibilityLabel="Đóng" onPress={onClose} className="absolute inset-0 bg-slate-950/75" />

        <View className="max-h-full w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101827]">
          <ScrollView contentContainerClassName="gap-4 p-6" bounces={false}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 flex-row items-center gap-3">
                <View className="rounded-2xl bg-amber-100 p-3 dark:bg-amber-500/15">
                  <Crown size={24} color="#B45309" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-black text-slate-900 dark:text-white">Nâng cấp SportGo Premium</Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">30.000đ / tháng</Text>
                </View>
              </View>
              <Pressable onPress={onClose} accessibilityLabel="Đóng" hitSlop={8} className="rounded-xl p-2">
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            <View className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
              <Text className="text-sm leading-6 text-slate-700 dark:text-slate-200">{PAYMENT_NOTICE}</Text>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
