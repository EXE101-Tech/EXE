import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, Camera, DollarSign, Layers, Settings, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { FACILITY_ICONS } from '@/components/courts/venue-card';
import { Input } from '@/components/ui/input';
import { SPORTS } from '@/lib/constants';
import { parseStoredCostToVnd } from '@/lib/price';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/api/resolve-media-url';
import { storageApi } from '@/api/storage';
import { ctaGradient } from '@/theme/colors';
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
  onCancel: () => void;
  isSubmitting: boolean;
  title: string;
  subtitle?: string;
  submitLabel: string;
}

function SectionLabel({
  index,
  icon: Icon,
  iconColor = '#94A3B8',
  required,
  children,
}: {
  index?: number;
  icon?: typeof DollarSign;
  iconColor?: string;
  required?: boolean;
  children: string;
}) {
  return (
    <View className="mb-2 flex-row items-center gap-1.5">
      {Icon ? <Icon size={13} color={iconColor} /> : null}
      <Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {index != null ? `${index}. ` : ''}
        {children}
        {required ? <Text className="text-rose-500"> *</Text> : null}
      </Text>
    </View>
  );
}

export function VenueForm({ initialVenue, onSubmit, onCancel, isSubmitting, title, subtitle, submitLabel }: VenueFormProps) {
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

  const courtCount = useWatch({ control, name: 'courtCount' });

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
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <LinearGradient colors={ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View className="flex-row items-start gap-3 px-4 py-4">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
            <Building2 size={22} color="#fff" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Settings size={15} color="#fff" />
              <Text className="text-lg font-black text-white">{title}</Text>
            </View>
            {subtitle ? <Text className="mt-0.5 text-xs font-medium text-white/80">{subtitle}</Text> : null}
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
        <Pressable onPress={handlePickImage} className="h-32 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
          {imagePreview ? (
            <Image source={{ uri: imagePreview }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="items-center gap-1.5">
              <Camera size={22} color="#94A3B8" />
              <Text className="text-xs font-semibold text-slate-500">
                {isUploadingImage ? 'Đang tải ảnh…' : 'Chọn ảnh sân'}
              </Text>
            </View>
          )}
        </Pressable>

        <View>
          <SectionLabel index={1} required>
            Chọn môn thể thao
          </SectionLabel>
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
          {errors.sportKey ? <Text className="mt-1 text-xs font-semibold text-rose-500">{errors.sportKey.message}</Text> : null}
        </View>

        <View>
          <SectionLabel>Mô tả sân</SectionLabel>
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Input
                placeholder="Mô tả tiện ích, khung giờ hoặc lưu ý cho người đặt sân"
                multiline
                numberOfLines={3}
                className="h-24 py-3"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <SectionLabel index={2} required>
              Tên khu sân / câu lạc bộ
            </SectionLabel>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  placeholder="VD: Sân Cầu Lông Proton VIP…"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <SectionLabel index={3} required>
              Địa chỉ sân
            </SectionLabel>
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <Input
                  placeholder="VD: 123 Thành Thái, Phường 14, Q.10…"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.address?.message}
                />
              )}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <SectionLabel index={4} icon={DollarSign} iconColor="#10B981" required>
              Giá mỗi khung giờ (30 phút)
            </SectionLabel>
            <Controller
              control={control}
              name="pricePerSlot"
              render={({ field }) => (
                <Input
                  placeholder="VD: 50.000"
                  keyboardType="number-pad"
                  className="font-black text-brand dark:text-brand-dark"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.pricePerSlot?.message}
                />
              )}
            />
            {!errors.pricePerSlot ? (
              <Text className="mt-1 text-[11px] text-amber-500">
                💡 Người chơi có thể đặt nhiều ô 30p liên tiếp (Ví dụ 2 tiếng = 4 ô).
              </Text>
            ) : null}
          </View>
          <View className="flex-1">
            <SectionLabel index={5} icon={Layers} iconColor="#14B8A6" required>
              Số lượng sân con sở hữu
            </SectionLabel>
            <Controller
              control={control}
              name="courtCount"
              render={({ field }) => (
                <Input
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.courtCount?.message}
                />
              )}
            />
            {!errors.courtCount ? (
              <Text className="mt-1 text-[11px] text-amber-500">
                💡 Hệ thống sẽ tự động tạo {courtCount || 0} hàng sân trong bảng đặt lịch.
              </Text>
            ) : null}
          </View>
        </View>

        <View>
          <SectionLabel>Dịch vụ & tiện ích sẵn có</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {Object.entries(FACILITY_ICONS).map(([key, facility]) => {
              const Icon = facility.icon;
              const active = !!facilities[key];
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleFacility(key)}
                  className={cn(
                    'basis-[48%] flex-row items-center gap-2 rounded-2xl border-2 px-3 py-2.5',
                    active
                      ? 'border-brand bg-brand/10 dark:border-brand-dark dark:bg-brand-dark/10'
                      : 'border-border bg-white dark:border-border-dark dark:bg-white/5',
                  )}
                >
                  <View
                    className={cn(
                      'h-8 w-8 items-center justify-center rounded-full',
                      active ? 'bg-brand/20 dark:bg-brand-dark/20' : 'bg-slate-100 dark:bg-white/10',
                    )}
                  >
                    <Icon size={15} color={active ? '#059669' : '#94A3B8'} />
                  </View>
                  <Text
                    className={cn(
                      'flex-1 text-xs font-bold',
                      active ? 'text-brand dark:text-brand-dark' : 'text-slate-600 dark:text-slate-300',
                    )}
                    numberOfLines={2}
                  >
                    {facility.label}
                  </Text>
                  {active ? <Sparkles size={13} color="#059669" /> : null}
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
      </ScrollView>

      <View className="flex-row items-center justify-end gap-3 border-t border-border bg-bg px-4 py-3 dark:border-border-dark dark:bg-bg-dark">
        <TouchableOpacity onPress={onCancel} className="px-3 py-3">
          <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Hủy bỏ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={submit}
          disabled={isSubmitting}
          className={cn('overflow-hidden rounded-xl', isSubmitting && 'opacity-50')}
        >
          <LinearGradient
            colors={ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Sparkles size={15} color="#fff" />
                <Text className="text-sm font-bold text-white">{submitLabel}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
