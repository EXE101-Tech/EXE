import { Flag } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { moderationApi } from '@/api/moderation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PopupModal } from '@/components/ui/popup-modal';

interface ReportModalProps {
  visible: boolean;
  targetType: 'post' | 'comment' | 'user' | 'message';
  targetId: number;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function ReportModal({ visible, targetType, targetId, onClose, onSubmitted }: ReportModalProps) {
  const [reason, setReason] = useState('Nội dung không phù hợp');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await moderationApi.report({ target_type: targetType, target_id: targetId, reason: reason.trim() });
      onSubmitted?.();
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể gửi báo cáo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title="Báo cáo nội dung"
      subtitle="Báo cáo sẽ được quản trị viên SportGo xem xét."
      icon={Flag}
      iconColor="#D97706"
      dismissOnBackdrop={!submitting}
      footer={
        <View className="flex-row justify-end gap-2.5">
          <Button variant="outline" label="Hủy" onPress={onClose} disabled={submitting} />
          <Button label="Gửi báo cáo" onPress={submit} loading={submitting} />
        </View>
      }
    >
      <Input value={reason} onChangeText={setReason} maxLength={80} placeholder="Lý do báo cáo" error={error} />
    </PopupModal>
  );
}
