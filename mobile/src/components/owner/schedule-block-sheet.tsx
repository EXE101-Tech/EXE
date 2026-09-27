import { Modal, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ScheduleBlockSheetProps {
  visible: boolean;
  rangeCount: number;
  note: string;
  onChangeNote: (note: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function ScheduleBlockSheet({
  visible,
  rangeCount,
  note,
  onChangeNote,
  onConfirm,
  onClose,
  isSubmitting,
}: ScheduleBlockSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full gap-4 rounded-2xl bg-white p-5 dark:bg-[#0F1E36]">
          <Text className="text-lg font-black text-slate-900 dark:text-white">Chặn khung giờ ngoài hệ thống</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            Bạn đang chặn {rangeCount} khung giờ đã chọn. Người chơi sẽ không thể đặt các khung giờ này.
          </Text>
          <Input placeholder="Ghi chú (không bắt buộc)" value={note} onChangeText={onChangeNote} />
          <View className="flex-row justify-end gap-2.5">
            <Button variant="outline" label="Hủy" onPress={onClose} disabled={isSubmitting} />
            <Button label="Xác nhận chặn" onPress={onConfirm} loading={isSubmitting} disabled={rangeCount === 0} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
