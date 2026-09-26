import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { GradientButton } from '@/components/brand/gradient-button';
import { Input } from '@/components/ui/input';
import { useCreateTeamMutation, useUpdateTeamMutation } from '@/hooks/queries/use-teams';
import { SPORTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { TeamResponse } from '@/schemas/teams';

const formSchema = z.object({
  sportKey: z.string().min(1, 'Chọn môn thể thao'),
  name: z.string().trim().min(2, 'Tên CLB tối thiểu 2 ký tự').max(160),
  location: z.string().trim().min(2, 'Khu vực tối thiểu 2 ký tự').max(255),
  totalSlots: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 2 && Number(v) <= 500, 'Từ 2 đến 500 thành viên'),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTeamModalProps {
  visible: boolean;
  onClose: () => void;
  team?: TeamResponse;
}

export function CreateTeamModal({ visible, onClose, team }: CreateTeamModalProps) {
  const createTeam = useCreateTeamMutation();
  const updateTeam = useUpdateTeamMutation();
  const isEditing = !!team;
  const mutation = isEditing ? updateTeam : createTeam;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      sportKey: team?.sport_id ?? SPORTS[0].key,
      name: team?.name ?? '',
      location: team?.location ?? '',
      totalSlots: team ? String(team.total_slots) : '20',
      description: team?.description ?? '',
      tags: team?.tags.join(', ') ?? '',
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    const sport = SPORTS.find((s) => s.key === values.sportKey)!;
    const payload = {
      name: values.name,
      sport_id: sport.key,
      sport_name: sport.name,
      location: values.location,
      total_slots: Number(values.totalSlots),
      description: values.description?.trim() || undefined,
      tags: (values.tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    try {
      if (isEditing) {
        await updateTeam.mutateAsync({ id: team.id, data: payload });
      } else {
        await createTeam.mutateAsync(payload);
      }
      handleClose();
    } catch {
      // Mutation error is surfaced below the form.
    }
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
          <Text className="text-lg font-black text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa CLB' : 'Thành lập CLB'}
          </Text>
          <TouchableOpacity onPress={handleClose} hitSlop={8}>
            <X size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
          <View>
            <Text className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Môn thể thao chính</Text>
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
            name="name"
            render={({ field }) => (
              <Input
                placeholder="Tên CLB (VD: CLB Cầu lông Proton)"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.name?.message}
              />
            )}
          />

          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <Input
                  containerClassName="flex-1"
                  placeholder="Khu vực hoạt động"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.location?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="totalSlots"
              render={({ field }) => (
                <Input
                  containerClassName="w-28"
                  placeholder="Số slot"
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.totalSlots?.message}
                />
              )}
            />
          </View>

          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Input
                placeholder="Mô tả và nội quy (không bắt buộc)"
                multiline
                numberOfLines={4}
                className="h-28 py-3"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <Input
                placeholder="Thẻ phân loại, ngăn cách bằng dấu phẩy"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          {mutation.isError ? (
            <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
              <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                {mutation.error instanceof Error ? mutation.error.message : 'Không lưu được CLB'}
              </Text>
            </View>
          ) : null}

          <GradientButton label={isEditing ? 'Lưu thay đổi' : 'Tạo CLB'} loading={mutation.isPending} onPress={submit} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
