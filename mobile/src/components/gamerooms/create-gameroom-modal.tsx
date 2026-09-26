import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { GradientButton } from '@/components/brand/gradient-button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/brand/loading-state';
import { useCreateGameroomMutation } from '@/hooks/queries/use-gamerooms';
import { useSportsQuery } from '@/hooks/queries/use-courts';
import { SKILL_REQUIREMENT_OPTIONS } from '@/lib/constants';
import { parseCostInputToVnd } from '@/lib/price';
import { getVietnamDate, slotStart } from '@/lib/slots';
import { cn } from '@/lib/utils';

const formSchema = z
  .object({
    sportId: z.string().min(1, 'Chọn môn thể thao'),
    title: z.string().trim().min(1, 'Nhập tên phòng').max(200),
    location: z.string().trim().max(255).optional(),
    requiredLevel: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Định dạng HH:mm'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Định dạng HH:mm'),
    maxPlayers: z
      .string()
      .trim()
      .refine((v) => /^\d+$/.test(v) && Number(v) >= 2, 'Tối thiểu 2 người'),
    priceInfo: z
      .string()
      .trim()
      .refine((v) => parseCostInputToVnd(v) !== null, 'Nhập số nguyên theo nghìn đồng, ví dụ 50 hoặc 50.000'),
    description: z.string().optional(),
  })
  .refine((values) => slotStart(values.date, values.endTime) > slotStart(values.date, values.startTime), {
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
    path: ['endTime'],
  });

type FormValues = z.infer<typeof formSchema>;

interface CreateGameroomModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateGameroomModal({ visible, onClose }: CreateGameroomModalProps) {
  const { data: sports, isLoading: isLoadingSports } = useSportsQuery();
  const createRoom = useCreateGameroomMutation();
  const availableSports = (sports ?? []).filter((s) => s.id != null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sportId: '',
      title: '',
      location: '',
      requiredLevel: 'Intermediate',
      date: getVietnamDate(),
      startTime: '19:00',
      endTime: '21:00',
      maxPlayers: '6',
      priceInfo: '',
      description: '',
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    const priceVnd = parseCostInputToVnd(values.priceInfo)!;
    try {
      await createRoom.mutateAsync({
        title: values.title,
        description: values.description?.trim() || undefined,
        location: values.location?.trim() || undefined,
        price_info: String(priceVnd / 1000),
        sport_id: Number(values.sportId),
        required_level: values.requiredLevel,
        start_time: slotStart(values.date, values.startTime).toISOString(),
        end_time: slotStart(values.date, values.endTime).toISOString(),
        max_players: Number(values.maxPlayers),
      });
      handleClose();
    } catch {
      // Mutation error is surfaced below the form.
    }
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
          <Text className="text-lg font-black text-slate-900 dark:text-white">Mở phòng chờ thi đấu</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={8}>
            <X size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {isLoadingSports ? (
          <LoadingState label="Đang tải danh sách môn thể thao…" />
        ) : (
          <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
            <View>
              <Text className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Môn thể thao</Text>
              <Controller
                control={control}
                name="sportId"
                render={({ field }) => (
                  <View className="flex-row flex-wrap gap-2">
                    {availableSports.map((sport) => (
                      <TouchableOpacity
                        key={sport.id}
                        onPress={() => field.onChange(String(sport.id))}
                        className={cn(
                          'rounded-xl border px-3 py-2',
                          field.value === String(sport.id)
                            ? 'border-transparent bg-brand dark:bg-brand-dark'
                            : 'border-border dark:border-border-dark',
                        )}
                      >
                        <Text
                          className={cn(
                            'text-xs font-bold',
                            field.value === String(sport.id) ? 'text-white' : 'text-slate-700 dark:text-slate-200',
                          )}
                        >
                          {sport.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
              {errors.sportId ? (
                <Text className="mt-1 text-xs font-semibold text-rose-500">{errors.sportId.message}</Text>
              ) : null}
            </View>

            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <Input
                  placeholder="Tên phòng / tiêu đề kèo đấu"
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
                  placeholder="Địa điểm / sân thi đấu (không bắt buộc)"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.location?.message}
                />
              )}
            />

            <View>
              <Text className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Trình độ yêu cầu</Text>
              <Controller
                control={control}
                name="requiredLevel"
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
                name="date"
                render={({ field }) => (
                  <Input
                    containerClassName="flex-1"
                    placeholder="Ngày (YYYY-MM-DD)"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.date?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="startTime"
                render={({ field }) => (
                  <Input
                    containerClassName="w-24"
                    placeholder="Bắt đầu"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.startTime?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="endTime"
                render={({ field }) => (
                  <Input
                    containerClassName="w-24"
                    placeholder="Kết thúc"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.endTime?.message}
                  />
                )}
              />
            </View>

            <View className="flex-row gap-3">
              <Controller
                control={control}
                name="maxPlayers"
                render={({ field }) => (
                  <Input
                    containerClassName="flex-1"
                    placeholder="Tổng số người chơi tối đa"
                    keyboardType="number-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.maxPlayers?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="priceInfo"
                render={({ field }) => (
                  <Input
                    containerClassName="flex-1"
                    placeholder="Chi phí/người (nghìn đồng)"
                    keyboardType="number-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.priceInfo?.message}
                  />
                )}
              />
            </View>

            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input
                  placeholder="Mô tả chi tiết & ghi chú (không bắt buộc)"
                  multiline
                  numberOfLines={3}
                  className="h-24 py-3"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            {createRoom.isError ? (
              <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
                <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                  {createRoom.error instanceof Error ? createRoom.error.message : 'Không tạo được phòng'}
                </Text>
              </View>
            ) : null}

            <GradientButton label="Tạo phòng ngay" loading={createRoom.isPending} onPress={submit} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
