import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { storageApi } from '@/api/storage';
import { Avatar } from '@/components/ui/avatar';
import { GradientButton } from '@/components/brand/gradient-button';
import { Input } from '@/components/ui/input';
import { SelectDropdown, type SelectOption } from '@/components/ui/select-dropdown';
import { useUpdateProfileMutation } from '@/hooks/queries/use-auth';
import { LEVEL_META, SKILL_LEVELS, SPORTS, SPORT_KEY_BY_NAME, type SkillLevel } from '@/lib/constants';
import type { NormalizedUser } from '@/stores/auth-store';

const nameSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên'),
});
type NameForm = z.infer<typeof nameSchema>;

const SKILL_OPTIONS: SelectOption[] = SKILL_LEVELS.map((level) => ({
  value: level,
  label: LEVEL_META[level].label,
}));

interface EditProfileModalProps {
  visible: boolean;
  user: NormalizedUser;
  onClose: () => void;
}

function buildInitialSports(user: NormalizedUser): Record<string, SkillLevel> {
  const result: Record<string, SkillLevel> = {};
  SPORTS.forEach((sport) => {
    result[sport.key] = 'Chưa biết';
  });
  (user.sports || []).forEach((item) => {
    const key = SPORT_KEY_BY_NAME[(item.sport?.name || '').toLowerCase()];
    if (key) result[key] = (item.skill_level as SkillLevel) ?? 'Chưa biết';
  });
  return result;
}

export function EditProfileModal({ visible, user, onClose }: EditProfileModalProps) {
  const updateProfile = useUpdateProfileMutation();
  // `user.profile.avatar_url` is already resolved to an absolute URL (for display); a freshly
  // uploaded photo's raw relative path is tracked separately and only sent if it actually changed.
  const [avatarPreview, setAvatarPreview] = useState(user.profile?.avatar_url ?? '');
  const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [sports, setSports] = useState<Record<string, SkillLevel>>(() => buildInitialSports(user));
  const [formError, setFormError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: user.name },
  });

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Hãy cấp quyền thư viện ảnh để đổi ảnh đại diện.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setIsUploadingAvatar(true);
    try {
      const url = await storageApi.uploadImage({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      setNewAvatarUrl(url);
      setAvatarPreview(resolveMediaUrl(url));
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể tải ảnh lên');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const submit = handleSubmit(async (values) => {
    setFormError('');
    try {
      await updateProfile.mutateAsync({ name: values.name, sports, avatar_url: newAvatarUrl ?? undefined });
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu hồ sơ');
    }
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark">
          <Text className="text-lg font-black text-slate-900 dark:text-white">Chỉnh sửa hồ sơ</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <X size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-5 p-4 pb-8">
          <View className="items-center gap-2">
            <Pressable onPress={handlePickAvatar} className="relative">
              <Avatar uri={avatarPreview} fallback={user.name} size={96} />
              <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand dark:border-[#0B1220] dark:bg-brand-dark">
                <Camera size={14} color="#fff" />
              </View>
            </Pressable>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isUploadingAvatar ? 'Đang tải ảnh…' : 'Chạm để đổi ảnh đại diện'}
            </Text>
          </View>

          <View>
            <Text className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">Họ và tên</Text>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  placeholder="Họ và tên"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                />
              )}
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Trình độ theo môn</Text>
            <View className="gap-2.5">
              {SPORTS.map((sport) => (
                <View key={sport.key} className="flex-row items-center gap-3">
                  <Text className="w-28 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {sport.emoji} {sport.name}
                  </Text>
                  <SelectDropdown
                    value={sports[sport.key] ?? 'Chưa biết'}
                    options={SKILL_OPTIONS}
                    onChange={(value) => setSports((prev) => ({ ...prev, [sport.key]: value as SkillLevel }))}
                    className="flex-1"
                  />
                </View>
              ))}
            </View>
          </View>

          {formError ? (
            <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
              <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">{formError}</Text>
            </View>
          ) : null}

          <GradientButton label="Lưu thay đổi" loading={updateProfile.isPending} onPress={submit} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
