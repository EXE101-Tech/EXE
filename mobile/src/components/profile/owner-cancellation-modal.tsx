import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, Ban, CheckCircle2, Trash2 } from 'lucide-react-native';
import { ActivityIndicator, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOwnerVenuesQuery } from '@/hooks/queries/use-owner-venues';
import { cn } from '@/lib/utils';

const dangerGradient = ['#DC2626', '#F97316'] as const;

interface OwnerCancellationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function OwnerCancellationModal({ visible, onClose, onConfirm, isSubmitting }: OwnerCancellationModalProps) {
  const { data: venues } = useOwnerVenuesQuery();
  const venueCount = venues?.length ?? 0;
  const canCancel = venueCount === 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/60 px-4">
        <View className="overflow-hidden rounded-3xl bg-bg dark:bg-bg-dark">
          <SafeAreaView edges={[]}>
            <LinearGradient colors={dangerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View className="gap-2 px-5 pb-5 pt-5">
                <View className="flex-row items-center gap-1.5 self-start rounded-full bg-white/20 px-3 py-1.5">
                  <Ban size={13} color="#fff" />
                  <Text className="text-xs font-bold text-white">Chủ sân</Text>
                </View>
                <Text className="text-xl font-black text-white">Hủy đăng ký chủ sân?</Text>
                <Text className="text-xs font-medium leading-5 text-white/85">
                  Thao tác này sẽ đưa tài khoản của bạn về trạng thái người dùng thường.
                </Text>
              </View>
            </LinearGradient>

            <View className="gap-3 p-4">
              {canCancel ? (
                <View className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                  <View className="flex-row items-center gap-1.5">
                    <CheckCircle2 size={15} color="#10B981" />
                    <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      Bạn có thể hủy đăng ký
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Tài khoản hiện không còn sân nào đang quản lý trên hệ thống.
                  </Text>
                </View>
              ) : (
                <View className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                  <View className="flex-row items-center gap-1.5">
                    <AlertTriangle size={15} color="#F59E0B" />
                    <Text className="text-sm font-black text-amber-600 dark:text-amber-400">
                      Bạn cần gỡ hết sân trước khi hủy
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Bạn đang quản lý {venueCount} sân. Vui lòng xóa hoặc chuyển nhượng trước khi hủy đăng ký chủ sân.
                  </Text>
                </View>
              )}

              <View className="flex-row items-start gap-2.5 rounded-2xl border border-border bg-slate-50 p-3.5 dark:border-border-dark dark:bg-white/5">
                <Trash2 size={16} color="#DC2626" />
                <Text className="flex-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Sau khi hủy, bạn sẽ không thể thêm hoặc quản lý sân cho đến khi đăng ký lại.
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-end gap-3 border-t border-border px-4 py-3 dark:border-border-dark">
              <Pressable onPress={onClose} className="px-3 py-3">
                <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Giữ đăng ký</Text>
              </Pressable>
              <TouchableOpacity
                onPress={onConfirm}
                disabled={isSubmitting || !canCancel}
                className={cn(
                  'items-center justify-center rounded-xl bg-rose-600 px-4 py-3',
                  (isSubmitting || !canCancel) && 'opacity-50',
                )}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-bold text-white" numberOfLines={1}>
                    Xác nhận hủy đăng ký
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
