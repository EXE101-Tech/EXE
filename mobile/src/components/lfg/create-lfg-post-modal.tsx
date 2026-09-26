import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ImagePlus, MapPin, PlusCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { storageApi } from '@/api/storage';
import { Input } from '@/components/ui/input';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { useCreateLfgPostMutation, useUpdateLfgPostMutation } from '@/hooks/queries/use-lfg';
import { SKILL_REQUIREMENT_OPTIONS, SPORTS } from '@/lib/constants';
import { parseCostInputToVnd, storedCostToInput } from '@/lib/price';
import { ctaGradient } from '@/theme/colors';
import { cn } from '@/lib/utils';
import type { LfgPostResponse } from '@/schemas/lfg';

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
  post?: LfgPostResponse;
}

function FieldLabel({
  icon: Icon,
  iconColor = '#94A3B8',
  required,
  children,
}: {
  icon?: typeof Calendar;
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

export function CreateLfgPostModal({ visible, onClose, post }: CreateLfgPostModalProps) {
  const createPost = useCreateLfgPostMutation();
  const updatePost = useUpdateLfgPostMutation();
  const isEditing = !!post;
  const mutation = isEditing ? updatePost : createPost;

  const [imageUrl, setImageUrl] = useState<string | undefined>(post?.image_url ?? undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    post?.image_url ? resolveMediaUrl(post.image_url) : undefined,
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
      sportKey: post?.sport_id ?? SPORTS[0].key,
      title: post?.title ?? '',
      location: post?.location ?? '',
      dateLabel: post?.date_label ?? '',
      timeSlot: post?.time_slot ?? '19:00 - 21:00',
      totalMembers: post ? String(post.total_members) : '4',
      skillLevel: post?.skill_level ?? 'Intermediate',
      price: post ? storedCostToInput(post.price ?? post.price_info) : '',
      description: post?.description ?? '',
    },
  });

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Hãy cấp quyền thư viện ảnh để chọn ảnh bài đăng.');
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
    const priceVnd = parseCostInputToVnd(values.price)!;
    const payload = {
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
      image_url: imageUrl,
    };
    try {
      if (isEditing) {
        await updatePost.mutateAsync({ id: post.id, data: payload });
      } else {
        await createPost.mutateAsync(payload);
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
          <View className="flex-row items-start justify-between gap-3 px-4 py-4">
            <View className="flex-1">
              <Text className="text-lg font-black text-white">
                {isEditing ? 'Chỉnh sửa bài đăng' : 'Đăng tìm người chơi'}
              </Text>
              <Text className="mt-0.5 text-xs font-medium text-white/80">
                {isEditing
                  ? 'Cập nhật thông tin bài đăng của bạn.'
                  : 'Bài đăng sẽ được lưu và hiển thị cho người chơi khác.'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
          <View>
            <Text className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Môn thể thao <Text className="text-rose-500">*</Text>
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
            <FieldLabel required>Tiêu đề</FieldLabel>
            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <Input
                  placeholder="VD: Tìm 2 người đánh đôi cầu lông, trình trung bình…"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.title?.message}
                />
              )}
            />
          </View>

          <View>
            <FieldLabel icon={MapPin} iconColor="#F43F5E" required>
              Địa điểm
            </FieldLabel>
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <Input
                  placeholder="VD: Sân cầu lông Viettel, Số 1 Đào Duy Anh, Phú Nhuận…"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.location?.message}
                />
              )}
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldLabel icon={Calendar} iconColor="#F59E0B" required>
                Ngày chơi
              </FieldLabel>
              <Controller
                control={control}
                name="dateLabel"
                render={({ field }) => (
                  <Input
                    placeholder="VD: 20/06"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.dateLabel?.message}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <FieldLabel required>Khung giờ</FieldLabel>
              <Controller
                control={control}
                name="timeSlot"
                render={({ field }) => (
                  <Input
                    placeholder="VD: 19:00 - 21:00"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.timeSlot?.message}
                  />
                )}
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldLabel>Tổng số người</FieldLabel>
              <Controller
                control={control}
                name="totalMembers"
                render={({ field }) => (
                  <Input
                    keyboardType="number-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.totalMembers?.message}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <FieldLabel>Trình độ</FieldLabel>
              <Controller
                control={control}
                name="skillLevel"
                render={({ field }) => (
                  <SelectDropdown
                    className="h-12 w-full bg-white dark:bg-[#0A1A30]"
                    value={field.value}
                    options={SKILL_REQUIREMENT_OPTIONS}
                    onChange={field.onChange}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <FieldLabel required>Chi phí/người</FieldLabel>
              <Controller
                control={control}
                name="price"
                render={({ field }) => (
                  <Input
                    placeholder="VD: 50 hoặc 50.000"
                    keyboardType="number-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.price?.message}
                  />
                )}
              />
              {!errors.price ? (
                <Text className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Nhập 50 = 50.000đ; có thể nhập 50.000.
                </Text>
              ) : null}
            </View>
          </View>

          <View>
            <FieldLabel>Mô tả</FieldLabel>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input
                  placeholder="Ghi chú thêm về trình độ mong muốn, dụng cụ, sđt liên hệ…"
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

          <View>
            <FieldLabel>Ảnh bài đăng (tối đa 8 MB)</FieldLabel>
            <Pressable
              onPress={handlePickImage}
              className={cn(
                'items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border dark:border-border-dark',
                imagePreview ? 'h-36' : 'h-14 flex-row gap-2',
              )}
            >
              {imagePreview ? (
                <Image source={{ uri: imagePreview }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <>
                  <ImagePlus size={16} color="#94A3B8" />
                  <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {isUploadingImage ? 'Đang tải ảnh…' : 'Chọn ảnh'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <Text className="text-xs text-slate-400 dark:text-slate-500">
            Tài khoản tạo bài được tính là thành viên đầu tiên.
          </Text>

          {mutation.isError ? (
            <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
              <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                {mutation.error instanceof Error ? mutation.error.message : 'Không lưu được bài đăng'}
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
              style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 }}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <PlusCircle size={15} color="#fff" />
                  <Text className="text-sm font-bold text-white">{isEditing ? 'Lưu thay đổi' : 'Đăng bài'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
