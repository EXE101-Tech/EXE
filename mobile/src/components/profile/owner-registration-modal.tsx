import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, Building2, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';

const registerGradient = ['#0D9488', '#22C55E'] as const;

interface OwnerRegistrationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

const RULES = [
  {
    icon: Calendar,
    iconColor: '#3B82F6',
    title: 'Check lịch hằng ngày',
    description: 'Chủ sân cần kiểm tra các lượt đặt trên hệ thống mỗi ngày.',
  },
  {
    icon: ShieldCheck,
    iconColor: '#14B8A6',
    title: 'Đồng bộ lịch đặt',
    description: 'Mọi lượt đặt bên ngoài phải được cập nhật lên SportGo để tránh xung đột.',
  },
  {
    icon: CheckCircle2,
    iconColor: '#22C55E',
    title: 'Đúng dịch vụ đã đăng ký',
    description: 'Đảm bảo các tiện ích, khung giờ và quyền lợi đã công bố cho người chơi.',
  },
  {
    icon: AlertTriangle,
    iconColor: '#F59E0B',
    title: 'Trách nhiệm khi có xung đột',
    description: 'Sân chịu trách nhiệm xử lý nếu nhận đặt bên ngoài nhưng không kiểm tra lịch trên hệ thống.',
  },
];

export function OwnerRegistrationModal({ visible, onClose, onConfirm, isSubmitting }: OwnerRegistrationModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/60 px-4">
        <View className="max-h-[85%] overflow-hidden rounded-3xl bg-bg dark:bg-bg-dark">
          <SafeAreaView edges={[]}>
            <LinearGradient colors={registerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View className="gap-2 px-5 pb-5 pt-5">
                <View className="flex-row items-center gap-1.5 self-start rounded-full bg-white/20 px-3 py-1.5">
                  <Building2 size={13} color="#fff" />
                  <Text className="text-xs font-bold text-white">Chủ sân</Text>
                </View>
                <Text className="text-xl font-black text-white">Đăng ký làm chủ sân</Text>
                <Text className="text-xs font-medium leading-5 text-white/85">
                  Đưa sân của bạn lên hệ thống để nhận đặt sân minh bạch, đồng bộ và chuyên nghiệp.
                </Text>
              </View>
            </LinearGradient>

            <ScrollView contentContainerClassName="gap-3 p-4" bounces={false}>
              <View className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-3.5">
                <Text className="text-sm font-black text-teal-600 dark:text-teal-400">
                  Mức phí dự kiến: 150.000đ/sân/tháng
                </Text>
                <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Hiện tại SportGo ghi nhận đăng ký; chưa tích hợp thu phí tự động.
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2.5">
                {RULES.map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <View
                      key={rule.title}
                      className="basis-[48%] gap-1.5 rounded-2xl border border-border bg-slate-50 p-3 dark:border-border-dark dark:bg-white/5"
                    >
                      <Icon size={16} color={rule.iconColor} />
                      <Text className="text-xs font-bold text-slate-800 dark:text-white">{rule.title}</Text>
                      <Text className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                        {rule.description}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View className="rounded-2xl border border-border bg-slate-50 px-3.5 py-3 dark:border-border-dark dark:bg-white/5">
                <Text className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                  Bằng việc tiếp tục, bạn xác nhận đã đọc và đồng ý với các quy định vận hành dành cho chủ sân
                  SportGo.
                </Text>
              </View>
            </ScrollView>

            <View className="flex-row items-center justify-end gap-3 border-t border-border px-4 py-3 dark:border-border-dark">
              <Pressable onPress={onClose} className="px-3 py-3">
                <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Để sau</Text>
              </Pressable>
              <TouchableOpacity
                onPress={onConfirm}
                disabled={isSubmitting}
                className={cn('overflow-hidden rounded-xl', isSubmitting && 'opacity-50')}
              >
                <LinearGradient
                  colors={registerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-bold text-white">Tôi đồng ý & tiếp tục</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
