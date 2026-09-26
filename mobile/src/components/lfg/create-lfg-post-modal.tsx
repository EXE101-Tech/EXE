import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { GradientButton } from '@/components/brand/gradient-button';
import { Input } from '@/components/ui/input';
import { useCreateLfgPostMutation } from '@/hooks/queries/use-lfg';
import { SKILL_REQUIREMENT_OPTIONS, SPORTS } from '@/lib/constants';
import { parseCostInputToVnd } from '@/lib/price';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  sportKey: z.string().min(1, 'Chọn môn thể thao'),
  title: z.string().trim().min(3, 'Tiêu đề tối thiểu 3 ký tự').max(200),
  location: z.string().trim().min(2, 'Địa điểm tối thiểu 2 ký tự').max(255),
  dateLabel: z.string().trim().min(1, 'Nhập ngày chơi'),
  timeSlot: z.string().trim().min(1, 'Nhập khung giờ'),
  totalMembers: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 2 && Number(v) <= 500, 'Từ 2 đến 500 người'),
  skillLevel: z.string().min(1),
  price: z
    .string()
    .trim()
    .refine((v) => parseCostInputToVnd(v) !== null, 'Nhập số nguyên theo nghìn đồng, ví dụ 50 hoặc 50.000'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateLfgPostModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateLfgPostModal({ visible, onClose }: CreateLfgPostModalProps) {
  const createPost = useCreateLfgPostMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sportKey: SPORTS[0].key,
      title: '',
      location: '',
      dateLabel: '',
      timeSlot: '19:00 - 21:00',
      totalMembers: '4',
      skillLevel: 'Intermediate',
      price: '',
      description: '',
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    const sport = SPORTS.find((s) => s.key === values.sportKey)!;
    const priceVnd = parseCostInputToVnd(values.price)!;
    try {
      await createPost.mutateAsync({
        sport_id: sport.key,
        sport_name: sport.name,
        title: values.title,
        location: values.location,
        date_label: values.dateLabel,
        time_slot: values.timeSlot,
        total_members: Number(values.totalMembers),
        skill_level: values.skillLevel,
        price: String(priceVnd / 1000),
        description: values.description?.trim() || undefined,
      });
      handleClose();
    } catch {
      // GradientButton stays enabled; the field-level zod errors already cover input mistakes.
    }
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
          <Text className="text-lg font-black text-slate-900 dark:text-white">Đăng tìm người chơi</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={8}>
            <X size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
          <View>
            <Text className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Môn thể thao</Text>
            <Controller
              control={control}
              name="sportKey"
              render={({ field }) => (
                <View className="flex-row flex-wrap gap-2">
                  {SPORTS.map((sport) => (
                    <TouchableOpacity
                      key={sport.key}
                      onPress={() => field.onChange(sport.key)}
                      className={cn(
                        'flex-row items-center gap-1.5 rounded-xl border px-3 py-2',
                        field.value === sport.key
                          ? 'border-transparent bg-brand dark:bg-brand-dark'
                          : 'border-border dark:border-border-dark',
                      )}
                    >
                      <Text>{sport.emoji}</Text>
                      <Text
                        className={cn(
                          'text-xs font-bold',
                          field.value === sport.key ? 'text-white' : 'text-slate-700 dark:text-slate-200',
                        )}
                      >
                        {sport.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <Input
                placeholder="Tiêu đề (VD: Tìm 2 người đánh đôi cầu lông)"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.title?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <Input
                placeholder="Địa điểm"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.location?.message}
              />
            )}
          />

          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="dateLabel"
              render={({ field }) => (
                <Input
                  containerClassName="flex-1"
                  placeholder="Ngày chơi (VD: 20/06)"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.dateLabel?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="timeSlot"
              render={({ field }) => (
                <Input
                  containerClassName="flex-1"
                  placeholder="Khung giờ"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.timeSlot?.message}
                />
              )}
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Trình độ</Text>
            <Controller
              control={control}
              name="skillLevel"
              render={({ field }) => (
                <View className="flex-row flex-wrap gap-2">
                  {SKILL_REQUIREMENT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => field.onChange(option.value)}
                      className={cn(
                        'rounded-xl border px-3 py-2',
                        field.value === option.value
                          ? 'border-transparent bg-brand dark:bg-brand-dark'
                          : 'border-border dark:border-border-dark',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-xs font-bold',
                          field.value === option.value ? 'text-white' : 'text-slate-700 dark:text-slate-200',
                        )}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="totalMembers"
              render={({ field }) => (
                <Input
                  containerClassName="flex-1"
                  placeholder="Tổng số người"
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.totalMembers?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <Input
                  containerClassName="flex-1"
                  placeholder="Chi phí/người (nghìn đồng)"
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.price?.message}
                />
              )}
            />
          </View>

          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Input
                placeholder="Mô tả (không bắt buộc)"
                multiline
                numberOfLines={3}
                className="h-24 py-3"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          {createPost.isError ? (
            <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
              <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                {createPost.error instanceof Error ? createPost.error.message : 'Không đăng được bài'}
              </Text>
            </View>
          ) : null}

          <GradientButton label="Đăng bài" loading={createPost.isPending} onPress={submit} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
