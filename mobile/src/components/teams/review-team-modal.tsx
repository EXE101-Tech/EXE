import { Star, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/brand/gradient-button';
import { Input } from '@/components/ui/input';
import { useCreateTeamReviewMutation } from '@/hooks/queries/use-teams';
import { cn } from '@/lib/utils';

const QUICK_TAGS = [
  'Sân đẹp',
  'Chủ CLB nhiệt tình',
  'Fairplay',
  'Đúng trình độ',
  'Bao trà đá',
  'Bầu không khí vui vẻ',
  'Đúng giờ',
  'Sân sạch sẽ',
  'Giá hợp lý',
  'Tổ chức tốt',
];

const RATING_LABEL: Record<number, string> = {
  1: 'Chưa tốt 😞',
  2: 'Tạm được 😐',
  3: 'Bình thường 🙂',
  4: 'Tốt 😊',
  5: 'Xuất sắc 🤩',
};

interface ReviewTeamModalProps {
  visible: boolean;
  teamId: number;
  onClose: () => void;
}

export function ReviewTeamModal({ visible, teamId, onClose }: ReviewTeamModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState('');
  const review = useCreateTeamReviewMutation(teamId);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setTags([]);
    setError('');
    onClose();
  };

  const submit = async () => {
    if (!rating) {
      setError('Vui lòng chọn số sao đánh giá.');
      return;
    }
    setError('');
    try {
      await review.mutateAsync({ rating, comment: comment.trim() || undefined, tags });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được đánh giá');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
          <Text className="text-lg font-black text-slate-900 dark:text-white">Đánh giá CLB</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={8}>
            <X size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-5 p-4 pb-8">
          <View className="items-center gap-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đánh giá tổng quan
            </Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setRating(value)} hitSlop={4}>
                  <Star size={32} color="#F59E0B" fill={value <= rating ? '#F59E0B' : 'transparent'} />
                </Pressable>
              ))}
            </View>
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {RATING_LABEL[rating] ?? 'Chọn số sao'}
            </Text>
          </View>

          <View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Điểm nổi bật (chọn nhanh)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  className={cn(
                    'rounded-full border px-3 py-1.5',
                    tags.includes(tag)
                      ? 'border-brand bg-brand/10 dark:border-brand-dark dark:bg-brand-dark/15'
                      : 'border-border dark:border-border-dark',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      tags.includes(tag) ? 'text-brand dark:text-brand-dark' : 'text-slate-600 dark:text-slate-400',
                    )}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nhận xét chi tiết (tùy chọn)
            </Text>
            <Input
              placeholder="VD: CLB rất tuyệt, sân đẹp, anh em nhiệt tình..."
              multiline
              numberOfLines={3}
              className="h-24 py-3"
              value={comment}
              onChangeText={setComment}
            />
          </View>

          {error ? (
            <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
              <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</Text>
            </View>
          ) : null}

          <GradientButton label="Gửi đánh giá" loading={review.isPending} onPress={submit} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
