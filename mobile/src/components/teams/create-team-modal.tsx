import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Crown, MapPin, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { storageApi } from '@/api/storage';
import { Input } from '@/components/ui/input';
import { useCreateTeamMutation, useUpdateTeamMutation } from '@/hooks/queries/use-teams';
import { SPORTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ctaGradient } from '@/theme/colors';
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

function FieldLabel({
  icon: Icon,
  iconColor = '#94A3B8',
  required,
  children,
}: {
  icon?: typeof MapPin;
  iconColor?: string;
  required?: boolean;
  children: string;
}) {
  return (
    <View className="mb-2 flex-row items-center gap-1.5">
      {Icon ? <Icon size={14} color={iconColor} /> : null}
      <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">
        {children}
        {required ? <Text className="text-rose-500"> *</Text> : null}
      </Text>
    </View>
  );
}

export function CreateTeamModal({ visible, onClose, team }: CreateTeamModalProps) {
  const createTeam = useCreateTeamMutation();
  const updateTeam = useUpdateTeamMutation();
  const isEditing = !!team;
  const mutation = isEditing ? updateTeam : createTeam;

  const [imageUrl, setImageUrl] = useState<string | undefined>(team?.image_url ?? undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    team?.image_url ? resolveMediaUrl(team.image_url) : undefined,
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Hãy cấp quyền thư viện ảnh để chọn ảnh CLB.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [16, 9] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setIsUploadingImage(true);
    try {
      const url = await storageApi.uploadImage({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      setImageUrl(url);
      setImagePreview(resolveMediaUrl(url));
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể tải ảnh lên');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleClose = () => {
    reset();
    setImageUrl(undefined);
    setImagePreview(undefined);
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
      image_url: imageUrl,
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
        <LinearGradient colors={ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View className="flex-row items-start gap-3 px-4 py-4">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
              <Crown size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black text-white">{isEditing ? 'Chỉnh sửa CLB' : 'Thành lập CLB'}</Text>
              <Text className="mt-0.5 text-xs font-medium text-white/80">Thông tin được lưu vào hệ thống</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
          <Pressable
            onPress={handlePickImage}
            className="h-32 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"
          >
            {imagePreview ? (
              <Image source={{ uri: imagePreview }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="items-center gap-1.5">
                <Camera size={22} color="#94A3B8" />
                <Text className="text-xs font-semibold text-slate-500">
                  {isUploadingImage ? 'Đang tải ảnh…' : 'Chọn ảnh CLB (không bắt buộc)'}
                </Text>
              </View>
            )}
          </Pressable>

          <View>
            <Text className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Môn thể thao chính
            </Text>
            <Controller
              control={control}
              name="sportKey"
              render={({ field }) => (
                <View className="flex-row flex-wrap gap-2">
                  {SPORTS.map((sport) => {
                    const isSelected = field.value === sport.key;
                    return (
                      <TouchableOpacity
                        key={sport.key}
                        onPress={() => field.onChange(sport.key)}
                        className={cn(
                          'basis-[31%] items-center gap-1 rounded-2xl border-2 px-2 py-3',
                          isSelected
                            ? 'border-brand bg-brand/10 dark:border-brand-dark dark:bg-brand-dark/10'
                            : 'border-border bg-white dark:border-border-dark dark:bg-white/5',
                        )}
                      >
                        <Text className="text-2xl">{sport.emoji}</Text>
                        <Text
                          className={cn(
                            'text-xs font-bold',
                            isSelected ? 'text-brand dark:text-brand-dark' : 'text-slate-700 dark:text-slate-200',
                          )}
                        >
                          {sport.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
          </View>

          <View>
            <FieldLabel required>Tên CLB</FieldLabel>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  placeholder="VD: CLB Cầu Lông Proton"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                />
              )}
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldLabel icon={MapPin} iconColor="#F43F5E" required>
                Khu vực hoạt động
              </FieldLabel>
              <Controller
                control={control}
                name="location"
                render={({ field }) => (
                  <Input
                    placeholder="Quận / thành phố"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.location?.message}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <FieldLabel icon={Users} iconColor="#3B82F6">
                Số thành viên tối đa
              </FieldLabel>
              <Controller
                control={control}
                name="totalSlots"
                render={({ field }) => (
                  <Input
                    keyboardType="number-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.totalSlots?.message}
                  />
                )}
              />
            </View>
          </View>

          <View>
            <FieldLabel>Mô tả và nội quy</FieldLabel>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input
                  placeholder="Lịch tập, trình độ, nội quy…"
                  multiline
                  numberOfLines={4}
                  className="h-28 py-3"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </View>

          <View>
            <FieldLabel>Thẻ phân loại (ngăn cách bằng dấu phẩy)</FieldLabel>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <Input
                  placeholder="Mọi trình độ, giao lưu"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </View>

          {mutation.isError ? (
            <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
              <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                {mutation.error instanceof Error ? mutation.error.message : 'Không lưu được CLB'}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View className="flex-row items-center justify-end gap-3 border-t border-border bg-bg px-4 py-3 dark:border-border-dark dark:bg-bg-dark">
          <TouchableOpacity onPress={handleClose} className="px-3 py-3">
            <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={submit}
            disabled={mutation.isPending}
            className={cn('overflow-hidden rounded-xl', mutation.isPending && 'opacity-50')}
          >
            <LinearGradient
              colors={ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-sm font-bold text-white">{isEditing ? 'Lưu thay đổi' : 'Tạo CLB'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
