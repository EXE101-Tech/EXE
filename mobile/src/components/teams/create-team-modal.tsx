import { Text } from '@/components/ui/text';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Crown, MapPin, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Image, Pressable, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { storageApi } from '@/api/storage';
import { LocationPicker } from '@/components/map/location-picker';
import { Input } from '@/components/ui/input';
import { PopupModal } from '@/components/ui/popup-modal';
import { useCreateTeamMutation, useUpdateTeamMutation } from '@/hooks/queries/use-teams';
import { BASIC_TEAM_MAX_MEMBERS, SPORTS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { showToast } from '@/stores/toast-store';
import { ctaGradient } from '@/theme/colors';
import type { TeamResponse } from '@/schemas/teams';
import { showAlert } from '@/stores/dialog-store';

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
  const isPremium = useAuthStore((s) => s.user?.isPremium ?? false);
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
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      sportKey: team?.sport_id ?? SPORTS[0].key,
      name: team?.name ?? '',
      location: team?.location ?? '',
      totalSlots: team ? String(team.total_slots) : String(BASIC_TEAM_MAX_MEMBERS),
      description: team?.description ?? '',
      tags: team?.tags.join(', ') ?? '',
    },
  });

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Cần quyền truy cập', 'Hãy cấp quyền thư viện ảnh để chọn ảnh CLB.');
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
      showAlert('Lỗi', error instanceof Error ? error.message : 'Không thể tải ảnh lên');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(undefined);
    setImagePreview(undefined);
  };

  const handleClose = () => {
    reset();
    setImageUrl(undefined);
    setImagePreview(undefined);
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    if (!isPremium && Number(values.totalSlots) > BASIC_TEAM_MAX_MEMBERS) {
      setError('totalSlots', { message: `Tài khoản thường tối đa ${BASIC_TEAM_MAX_MEMBERS} thành viên` });
      return;
    }
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
      image_url: imageUrl ?? null,
    };
    try {
      if (isEditing) {
        await updateTeam.mutateAsync({ id: team.id, data: payload });
      } else {
        await createTeam.mutateAsync(payload);
      }
      handleClose();
      showToast(isEditing ? 'Đã cập nhật thông tin CLB.' : 'Đã tạo CLB.');
    } catch {
      // Mutation error is surfaced below the form.
    }
  });

  return (
    <PopupModal
      visible={visible}
      onClose={handleClose}
      title={isEditing ? 'Chỉnh sửa CLB' : 'Thành lập CLB'}
      subtitle="Thông tin được lưu vào hệ thống"
      icon={Crown}
      bodyClassName="gap-4"
      footer={
        <View className="flex-row items-center justify-end gap-3">
      <TouchableOpacity onPress={handleClose} className="px-3 py-3">
        <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Hủy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={submit}
        disabled={mutation.isPending || isUploadingImage}
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
      }
    >
        <Pressable
          onPress={handlePickImage}
          disabled={isUploadingImage || mutation.isPending}
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
        {imagePreview ? (
          <TouchableOpacity
            onPress={handleRemoveImage}
            disabled={isUploadingImage || mutation.isPending}
            className="self-end rounded-lg px-2 py-1 disabled:opacity-50"
          >
            <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">Gỡ ảnh CLB</Text>
          </TouchableOpacity>
        ) : null}

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

        <View>
          <FieldLabel icon={MapPin} iconColor="#F43F5E" required>
            Khu vực hoạt động
          </FieldLabel>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <LocationPicker
                placeholder="Quận / thành phố hoặc chọn trên map..."
                value={field.value}
                onChange={field.onChange}
                error={errors.location?.message}
              />
            )}
          />
        </View>

        <View>
          <View>
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
            {!errors.totalSlots ? (
              <Text className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {isPremium
                  ? 'Premium có thể mở rộng số thành viên.'
                  : `Tài khoản thường tối đa ${BASIC_TEAM_MAX_MEMBERS} thành viên.`}
              </Text>
            ) : null}
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
    </PopupModal>
  );
}
