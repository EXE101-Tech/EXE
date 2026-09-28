import { Text } from '@/components/ui/text';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ChevronRight, Crown, Eye, ImagePlus, LogOut, Pencil, Trophy, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, TouchableOpacity, View } from 'react-native';
import { storageApi } from '@/api/storage';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { StatCard } from '@/components/brand/stat-card';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { ImageLightbox } from '@/components/profile/image-lightbox';
import { useMeStatsQuery, useUpdateProfileMutation } from '@/hooks/queries/use-auth';
import { isActiveSportName, LEVEL_META, SPORT_KEY_BY_NAME, SPORTS, type SkillLevel } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: stats, isLoading: statsLoading } = useMeStatsQuery();
  const updateProfile = useUpdateProfileMutation();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  if (!user) return <LoadingState />;

  const handleChangeCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Hãy cấp quyền thư viện ảnh để đổi ảnh bìa.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setIsUploadingCover(true);
    try {
      const url = await storageApi.uploadImage({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      await updateProfile.mutateAsync({ cover_url: url });
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không tải được ảnh bìa');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const displayName = user.name;
  const skills = (user.sports || []).filter((item) => isActiveSportName(item.sport?.name)).map((item) => {
    const sportName = item.sport?.name || 'Môn thể thao';
    const key = SPORT_KEY_BY_NAME[sportName.trim().toLowerCase()];
    const sportMeta = SPORTS.find((s) => s.key === key);
    return {
      id: item.id,
      sport: sportName,
      emoji: sportMeta?.emoji ?? '🏅',
      level: LEVEL_META[item.skill_level as SkillLevel]?.label ?? item.skill_level,
      games: item.games_played || 0,
    };
  });

  const statsCards = [
    { label: 'Trận đã chơi', value: stats?.games_played ?? 0, icon: Trophy, colorClassName: 'bg-amber-500/10', iconColor: '#D97706' },
    { label: 'CLB tham gia', value: stats?.teams_joined ?? 0, icon: Users, colorClassName: 'bg-blue-500/10', iconColor: '#2563EB' },
  ];

  return (
    <ScreenContainer className="px-4">
      <TopNavbar />

      <View className="mb-2">
        <Text className="mb-1 text-base font-semibold text-slate-500 dark:text-slate-400">Xin chào</Text>
        <Text className="text-3xl font-black text-slate-900 dark:text-white">{displayName}</Text>
      </View>

      <View className="overflow-hidden rounded-lg border border-[#DCE5DB] dark:border-[#34453A]">
        <View className="h-40 bg-slate-200 dark:bg-slate-800">
          {user.profile?.cover_url ? (
            <Image source={{ uri: user.profile.cover_url }} className="h-full w-full" resizeMode="cover" />
          ) : null}

          <View className="absolute right-3 top-3 flex-row gap-2">
            {user.profile?.cover_url ? (
              <TouchableOpacity
                onPress={() => setIsCoverPreviewOpen(true)}
                className="flex-row items-center gap-1 rounded-full bg-black/50 px-2.5 py-1.5"
              >
                <Eye size={13} color="#fff" />
                <Text className="text-xs font-bold text-white">Xem ảnh</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={handleChangeCover}
              disabled={isUploadingCover}
              className="flex-row items-center gap-1 rounded-full bg-black/50 px-2.5 py-1.5"
            >
              <ImagePlus size={13} color="#fff" />
              <Text className="text-xs font-bold text-white">{isUploadingCover ? 'Đang tải…' : 'Đổi ảnh bìa'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-white px-5 pb-6 dark:bg-[#1C2A21]">
          <View className="-mt-10 flex-row items-end gap-4 pb-4">
            <View className="rounded-full border-4 border-white p-0.5 dark:border-[#1C2A21]">
              <Avatar uri={user.profile?.avatar_url} fallback={displayName} size={80} />
            </View>
            <View className="flex-1 pb-1">
              <Text className="text-xl font-black text-slate-900 dark:text-white" numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400" numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setIsEditOpen(true)}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-brand px-2 py-3 dark:bg-brand-dark"
            >
              <Pencil size={13} color="#fff" />
              <Text className="text-center text-[11px] font-bold text-white" numberOfLines={2}>
                Chỉnh sửa hồ sơ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={logout}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-rose-500/40 px-2 py-3"
            >
              <LogOut size={13} color="#DC2626" />
              <Text className="text-center text-[11px] font-bold text-rose-600 dark:text-rose-400" numberOfLines={1}>
                Đăng xuất
              </Text>
            </TouchableOpacity>
          </View>

          {statsLoading ? (
            <LoadingState label="Đang tải thống kê…" />
          ) : (
            <View className="mt-5 flex-row flex-wrap gap-3">
              {statsCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </View>
          )}

          <View className="mt-6 border-t border-border pt-5 dark:border-border-dark">
            <Text className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Hồ sơ kỹ năng</Text>
            {skills.length === 0 ? (
              <Text className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-slate-500 dark:border-border-dark dark:text-slate-400">
                Bạn chưa thêm môn thể thao hoặc trình độ. Hãy cập nhật hồ sơ để lưu kỹ năng của mình.
              </Text>
            ) : (
              <View className="gap-3">
                {skills.map((skill) => (
                  <View key={skill.id} className="rounded-2xl border border-border p-3.5 dark:border-border-dark">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="font-bold text-slate-800 dark:text-slate-100">
                        {skill.emoji} {skill.sport}
                      </Text>
                      <Text className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">
                        {skill.level}
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                      {skill.games} trận
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/premium')}
        accessibilityLabel="Xem SportGo Premium"
        className="mt-3 flex-row items-center gap-3 rounded-lg border border-[#DCE5DB] bg-white px-4 py-4 dark:border-[#34453A] dark:bg-[#1C2A21]"
      >
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#F7E6B0]">
          <Crown size={18} color="#8F6215" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-900 dark:text-white">SportGo Premium</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">Quyền lợi dành cho người chơi</Text>
        </View>
        <ChevronRight size={18} color="#7A887C" />
      </TouchableOpacity>

      <EditProfileModal visible={isEditOpen} user={user} onClose={() => setIsEditOpen(false)} />
      {user.profile?.cover_url ? (
        <ImageLightbox
          visible={isCoverPreviewOpen}
          uri={user.profile.cover_url}
          onClose={() => setIsCoverPreviewOpen(false)}
        />
      ) : null}
    </ScreenContainer>
  );
}
