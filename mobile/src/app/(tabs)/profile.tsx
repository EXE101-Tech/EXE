import * as ImagePicker from 'expo-image-picker';
import { CalendarDays, Eye, ImagePlus, LogOut, Star, Trophy, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';

import { storageApi } from '@/api/storage';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/brand/gradient-button';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { StatCard } from '@/components/brand/stat-card';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { ImageLightbox } from '@/components/profile/image-lightbox';
import { useMeStatsQuery, useUpdateProfileMutation } from '@/hooks/queries/use-auth';
import { LEVEL_META, SPORT_KEY_BY_NAME, SPORTS, type SkillLevel } from '@/lib/constants';
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
  const skills = (user.sports || []).map((item) => {
    const sportName = item.sport?.name || 'Môn thể thao';
    const key = SPORT_KEY_BY_NAME[sportName.toLowerCase()];
    const sportMeta = SPORTS.find((s) => s.key === key);
    const level = LEVEL_META[item.skill_level as SkillLevel] ?? { label: item.skill_level, percentage: 0 };
    return {
      id: item.id,
      sport: sportName,
      emoji: sportMeta?.emoji ?? '🏅',
      level: level.label,
      percentage: level.percentage,
      games: item.games_played || 0,
      rating: Number(item.rating || 0).toFixed(1),
    };
  });

  const statsCards = [
    { label: 'Trận đã chơi', value: stats?.games_played ?? 0, icon: Trophy, colorClassName: 'bg-amber-500/10', iconColor: '#D97706' },
    { label: 'CLB tham gia', value: stats?.teams_joined ?? 0, icon: Users, colorClassName: 'bg-blue-500/10', iconColor: '#2563EB' },
    { label: 'Lần đặt sân', value: stats?.bookings_count ?? 0, icon: CalendarDays, colorClassName: 'bg-emerald-500/10', iconColor: '#059669' },
    { label: 'Điểm kỹ năng TB', value: stats?.average_skill_rating ?? '—', icon: Star, colorClassName: 'bg-violet-500/10', iconColor: '#7C3AED' },
  ];

  return (
    <ScreenContainer className="px-4">
      <TopNavbar />

      <View className="mb-2">
        <Text className="mb-1 text-base font-semibold text-slate-500 dark:text-slate-400">Xin chào</Text>
        <Text className="text-3xl font-black text-slate-900 dark:text-white">{displayName}</Text>
      </View>

      <View className="overflow-hidden rounded-3xl border border-border dark:border-border-dark">
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

        <View className="bg-white px-5 pb-6 dark:bg-[#0F1E36]">
          <View className="-mt-10 flex-row items-end gap-4 pb-4">
            <View className="rounded-full border-4 border-white p-0.5 dark:border-[#0F1E36]">
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

          <View className="flex-row gap-3">
            <GradientButton label="Chỉnh sửa hồ sơ" className="flex-1" onPress={() => setIsEditOpen(true)} />
            <Button variant="outline" size="icon" className="h-12 w-12" onPress={logout}>
              <LogOut size={18} color="#DC2626" />
            </Button>
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
                    <Text className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                      {skill.games} trận · {skill.rating} rating
                    </Text>
                    <View className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60">
                      <View className="h-full rounded-full bg-brand dark:bg-brand-dark" style={{ width: `${skill.percentage}%` }} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

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
