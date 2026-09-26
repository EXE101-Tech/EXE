import { Sparkles } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';

interface BookingBarProps {
  selectedCount: number;
  totalPrice: number;
  onConfirm: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  scheduleLoading?: boolean;
  confirmLabel?: string;
}

export function BookingBar({
  selectedCount,
  totalPrice,
  onConfirm,
  isSubmitting,
  disabled,
  scheduleLoading,
  confirmLabel = 'Xác nhận đặt sân',
}: BookingBarProps) {
  const hours = (selectedCount * 0.5).toFixed(1);
  const label = scheduleLoading ? 'Đang tải lịch sân' : confirmLabel;

  return (
    <View className="flex-row items-center justify-between gap-3 border-t border-border bg-white px-4 py-3 dark:border-border-dark dark:bg-[#0F1E36]">
      <View>
        <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Tổng thanh toán dự kiến
        </Text>
        <Text className="text-xl font-black text-emerald-600 dark:text-emerald-400">
          {selectedCount > 0 ? `${totalPrice.toLocaleString('vi-VN')}đ` : '0đ'}
        </Text>
        <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {selectedCount > 0 ? `${selectedCount} ô (${hours} giờ)` : 'Chưa chọn ô nào'}
        </Text>
      </View>
      <Button onPress={onConfirm} disabled={selectedCount === 0 || disabled} loading={isSubmitting}>
        <Sparkles size={14} color="#fff" />
        <Text className="text-sm font-bold text-white">{label}</Text>
      </Button>
    </View>
  );
}
