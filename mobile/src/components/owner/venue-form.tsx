import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Image, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';

import { FACILITY_ICONS } from '@/components/courts/venue-card';
import { GradientButton } from '@/components/brand/gradient-button';
import { Input } from '@/components/ui/input';
import { SPORTS } from '@/lib/constants';
import { parseStoredCostToVnd } from '@/lib/price';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/api/resolve-media-url';
import { storageApi } from '@/api/storage';
import type { OwnerVenueInput, OwnerVenueResponse } from '@/schemas/owner';

const venueFormSchema = z.object({
  name: z.string().trim().min(2, 'Tên sân tối thiểu 2 ký tự').max(160),
  address: z.string().trim().min(3, 'Địa chỉ tối thiểu 3 ký tự').max(255),
  sportKey: z.string().min(1, 'Chọn môn thể thao'),
  pricePerSlot: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) > 0, 'Nhập giá hợp lệ (VNĐ)'),
  courtCount: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 50, 'Từ 1 đến 50 sân'),
  description: z.string().optional(),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

interface VenueFormProps {
  initialVenue?: OwnerVenueResponse;
  onSubmit: (data: OwnerVenueInput) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}

export function VenueForm({ initialVenue, onSubmit, isSubmitting, submitLabel }: VenueFormProps) {
  const [facilities, setFacilities] = useState<Record<string, boolean>>(initialVenue?.facilities ?? {});
  // `imageUrl` is the raw relative path submitted to the API; `imagePreview` is the same path
  // resolved to an absolute URL so <Image> can actually load it for local preview.
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialVenue?.image_url ?? undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    initialVenue?.image_url ? resolveMediaUrl(initialVenue.image_url) : undefined,
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: initialVenue?.name ?? '',
      address: initialVenue?.address ?? '',
      sportKey: initialVenue?.sport_id ?? '',
      pricePerSlot: initialVenue?.price_label ? String(parseStoredCostToVnd(initialVenue.price_label) ?? '') : '',
      courtCount: initialVenue ? String(initialVenue.court_count) : '1',
      description: initialVenue?.description ?? '',
    },
  });

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Hãy cấp quyền thư viện ảnh để chọn ảnh sân.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
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

  const toggleFacility = (key: string) => {
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const submit = handleSubmit(async (values) => {
    setFormError('');
    try {
      await onSubmit({
        name: values.name,
        address: values.address,
        sport_id: values.sportKey,
        price_label: `${Number(values.pricePerSlot).toLocaleString('vi-VN')}đ`,
        court_count: Number(values.courtCount),
        facilities,
        description: values.description?.trim() || undefined,
        image_url: imageUrl,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu thông tin sân');
    }
  });

  return (
    <View className="gap-4">
      <Pressable onPress={handlePickImage} className="h-36 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
        {imagePreview ? (
          <Image source={{ uri: imagePreview }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="items-center gap-1.5">
            <Camera size={24} color="#94A3B8" />
            <Text className="text-xs font-semibold text-slate-500">
              {isUploadingImage ? 'Đang tải ảnh…' : 'Chọn ảnh sân'}
            </Text>
          </View>
        )}
      </Pressable>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            placeholder="Tên sân"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="address"
        render={({ field }) => (
          <Input
            placeholder="Địa chỉ"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.address?.message}
          />
        )}
      />

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
        {errors.sportKey ? <Text className="mt-1 text-xs font-semibold text-rose-500">{errors.sportKey.message}</Text> : null}
      </View>

      <View className="flex-row gap-3">
        <Controller
          control={control}
          name="pricePerSlot"
          render={({ field }) => (
            <Input
              containerClassName="flex-1"
              placeholder="Giá / 30 phút (VNĐ)"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.pricePerSlot?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="courtCount"
          render={({ field }) => (
            <Input
              containerClassName="w-24"
              placeholder="Số sân"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.courtCount?.message}
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
            className="h-20 py-3"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />

      <View>
        <Text className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Tiện ích</Text>
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(FACILITY_ICONS).map(([key, facility]) => {
            const Icon = facility.icon;
            const active = !!facilities[key];
            return (
              <TouchableOpacity
                key={key}
                onPress={() => toggleFacility(key)}
                className={cn(
                  'flex-row items-center gap-1.5 rounded-xl border px-3 py-2',
                  active ? 'border-transparent bg-emerald-600' : 'border-border dark:border-border-dark',
                )}
              >
                <Icon size={14} color={active ? '#fff' : '#64748B'} />
                <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-600 dark:text-slate-300')}>
                  {facility.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {formError ? (
        <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
          <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">{formError}</Text>
        </View>
      ) : null}

      <GradientButton label={submitLabel} loading={isSubmitting} onPress={submit} />
    </View>
  );
}
