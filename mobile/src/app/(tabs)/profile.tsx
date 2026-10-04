import { Text } from '@/components/ui/text';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import { Crown, Eye, ImagePlus, LogOut, MapPin, Pencil, Trash2, Trophy, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { storageApi } from '@/api/storage';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { StatCard } from '@/components/brand/stat-card';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { MySocialPosts } from '@/components/social/my-social-posts';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { ImageLightbox } from '@/components/profile/image-lightbox';
import { useMeStatsQuery, useUpdateProfileMutation } from '@/hooks/queries/use-auth';
import { isActiveSportName, LEVEL_META, SPORT_KEY_BY_NAME, SPORTS, type SkillLevel } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { showAlert } from '@/stores/dialog-store';
import { UserName } from '@/components/ui/user-name';

const LEVEL_RANK: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const { data: stats, isLoading: statsLoading } = useMeStatsQuery();
  const updateProfile = useUpdateProfileMutation();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const confirmDeleteAccount = () => {
    showAlert('Xóa tài khoản', 'Tài khoản và dữ liệu gắn với tài khoản sẽ được xóa. Hành động này không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa tài khoản',
        style: 'destructive',
        onPress: () => deleteAccount().catch((error) => showAlert('Lỗi', error instanceof Error ? error.message : 'Không thể xóa tài khoản.')),
      },
    ]);
  };

  if (!user) return <LoadingState />;

  const handleChangeCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Cần quyền truy cập', 'Hãy cấp quyền thư viện ảnh để đổi ảnh bìa.');
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
      showAlert('Lỗi', error instanceof Error ? error.message : 'Không tải được ảnh bìa');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const displayName = user.name;
  // One card per sport (like the web profile): the highest level wins and the game counts are summed.
  const skillsBySport = new Map<string, { id: number; sport: string; emoji: string; level: string; rawLevel: string; games: number }>();
  for (const item of (user.sports || []).filter((entry) => isActiveSportName(entry.sport?.name))) {
    const sportName = item.sport?.name || 'Môn thể thao';
    const key = SPORT_KEY_BY_NAME[sportName.trim().toLowerCase()] ?? sportName.toLowerCase();
    const sportMeta = SPORTS.find((s) => s.key === key);
    const previous = skillsBySport.get(key);
    const higher = (LEVEL_RANK[item.skill_level] || 0) >= (LEVEL_RANK[previous?.rawLevel ?? ''] || 0);
    skillsBySport.set(key, {
      id: item.id,
      sport: sportMeta?.name ?? sportName,
      emoji: sportMeta?.emoji ?? '🏅',
      level: higher || !previous ? (LEVEL_META[item.skill_level as SkillLevel]?.label ?? item.skill_level) : previous.level,
      rawLevel: higher || !previous ? item.skill_level : previous.rawLevel,
      games: (previous?.games ?? 0) + (stats?.games_by_sport?.[String(item.sport_id)] ?? item.games_played ?? 0),
    });
  }
  const skills = [...skillsBySport.values()];

  const statsCards = [
    { label: 'Trận đã chơi', value: stats?.games_played ?? 0, icon: Trophy, colorClassName: 'bg-amber-500/10', iconColor: '#D97706' },
    { label: 'CLB tham gia', value: stats?.teams_joined ?? 0, icon: Users, colorClassName: 'bg-blue-500/10', iconColor: '#2563EB' },
  ];

  return (
    <ScreenContainer className="px-4">
      <TopNavbar />

      <View className="mb-2">
        <Text className="mb-1 text-[11px] font-extrabold tracking-widest text-brand dark:text-brand-dark">HÀNH TRÌNH CỦA BẠN</Text>
        <Text className="text-3xl font-black text-slate-900 dark:text-white">Hồ sơ cá nhân</Text>
      </View>

      <View className="overflow-hidden rounded-3xl border border-border dark:border-border-dark">
        <View className="h-40 bg-slate-200 dark:bg-slate-800">
          {user.profile?.cover_url ? (
            <Image source={{ uri: user.profile.cover_url }} className="h-full w-full" resizeMode="cover" />
          ) : (
            // Default cover, same slate-to-blue tint the web profile lays over its stock photo.
            <LinearGradient
              colors={['#0b1325', '#1c2b52', '#4a6fd8']}
              start={{ x: 0, y: 0.3 }}
              end={{ x: 1, y: 0.7 }}
              style={{ width: '100%', height: '100%' }}
            />
          )}

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

        <View className="bg-white px-5 pb-6 dark:bg-[#111827]">
          <View className="-mt-10 flex-row items-end gap-4 pb-4">
            <View className="rounded-full border-4 border-white p-0.5 dark:border-[#111827]">
              <Avatar uri={user.profile?.avatar_url} fallback={displayName} size={80} premium={user.isPremium} />
            </View>
            <View className="flex-1 pb-1">
              <View className="flex-row items-center gap-1.5">
                <UserName premium={user.isPremium} className="shrink text-xl font-black" numberOfLines={1}>
                  {displayName}
                </UserName>
                {user.isPremium ? <Crown size={16} color="#8b8cff" fill="#8b8cff" /> : null}
              </View>
              <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400" numberOfLines={1}>
                {user.email}
              </Text>
              {user.profile?.district ? (
                <View className="mt-1 flex-row items-center gap-1">
                  <MapPin size={12} color="#94A3B8" />
                  <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400" numberOfLines={1}>
                    Khu vực: {user.profile.district}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {user.profile?.bio ? (
            <Text className="-mt-1 mb-4 text-[13px] leading-5 text-slate-500 dark:text-slate-400">{user.profile.bio}</Text>
          ) : null}

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

          <View className="mt-4 flex-row flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 dark:border-border-dark">
            <TouchableOpacity onPress={() => Linking.openURL('https://sportgo.io.vn/privacy-policy')}>
              <Text className="text-xs font-bold text-brand dark:text-brand-dark">Chính sách quyền riêng tư</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://sportgo.io.vn/account-deletion')}>
              <Text className="text-xs font-bold text-brand dark:text-brand-dark">Yêu cầu xóa tài khoản</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmDeleteAccount} className="ml-auto flex-row items-center gap-1">
              <Trash2 size={13} color="#DC2626" />
              <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">Xóa tài khoản</Text>
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
            <Text className="text-lg font-bold text-slate-900 dark:text-white">Hồ sơ kỹ năng</Text>
            <Text className="mb-3 text-sm text-slate-500 dark:text-slate-400">Trình độ và hoạt động thể thao</Text>
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

      <MySocialPosts />

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
