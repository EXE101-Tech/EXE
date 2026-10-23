import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, MessageSquareText, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { FeedProfilePanel } from '@/components/social/feed-profile-panel';
import { FeedSuggestions } from '@/components/social/feed-suggestions';
import { PostComposerModal } from '@/components/social/post-composer-modal';
import { SocialPostCard } from '@/components/social/social-post-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSocialFeedQuery } from '@/hooks/queries/use-social';
import { useAuthStore } from '@/stores/auth-store';

/** Community feed (web: "Cộng đồng"): share posts, like, comment, and discover rooms, clubs and friends. */
export default function CommunityScreen() {
  const user = useAuthStore((s) => s.user);
  const { search } = useLocalSearchParams<{ search?: string }>();
  const searchTerm = (search ?? '').trim();
  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSocialFeedQuery(searchTerm);
  const [composerOpen, setComposerOpen] = useState(false);

  const posts = data?.pages.flat() ?? [];

  const header = (
    <View className="mb-3 gap-4">
      {searchTerm.length >= 2 ? (
        <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 dark:border-border-dark dark:bg-[#111827]">
          <Text className="flex-1 text-sm text-slate-600 dark:text-slate-300" numberOfLines={1}>
            Kết quả bài viết cho <Text className="font-black">“{searchTerm}”</Text>
          </Text>
          <Pressable hitSlop={8} accessibilityLabel="Xóa tìm kiếm" onPress={() => router.setParams({ search: undefined })}>
            <X size={16} color="#94A3B8" />
          </Pressable>
        </View>
      ) : null}
      <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-white p-3 dark:border-border-dark dark:bg-[#111827]">
        <Avatar uri={user?.profile?.avatar_url} fallback={user?.name ?? 'U'} size={40} premium={user?.isPremium} />
        <Pressable
          onPress={() => setComposerOpen(true)}
          className="h-11 flex-1 justify-center rounded-full bg-slate-100 px-4 dark:bg-white/5"
        >
          <Text className="text-sm text-slate-500 dark:text-slate-400" numberOfLines={1}>
            Bạn muốn chia sẻ gì?
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setComposerOpen(true)}
          accessibilityLabel="Đăng ảnh hoặc video"
          className="h-11 w-11 items-center justify-center rounded-full"
        >
          <Camera size={22} color="#059669" />
        </Pressable>
      </View>
      <FeedProfilePanel />
      <FeedSuggestions />
    </View>
  );

  return (
    <ScreenContainer scroll={false} className="px-4">
      <TopNavbar />

      <View className="mb-3">
        <Text className="text-[11px] font-extrabold tracking-widest text-brand dark:text-brand-dark">CỘNG ĐỒNG</Text>
        <Text className="text-xl font-black text-slate-900 dark:text-white">Bảng tin SportGo</Text>
      </View>

      {isLoading ? (
        <LoadingState label="Đang tải cộng đồng…" />
      ) : isError ? (
        <>
          {header}
          <EmptyState
            icon={MessageSquareText}
            title={error instanceof Error ? error.message : 'Không tải được cộng đồng'}
            description="Kéo để tải lại."
          />
        </>
      ) : (
        <FlatList
          className="flex-1"
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-3 pb-8"
          onRefresh={refetch}
          refreshing={isRefetching && !isFetchingNextPage}
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListHeaderComponent={header}
          renderItem={({ item }) => <SocialPostCard post={item} currentUserId={user?.id} />}
          ListEmptyComponent={
            <View className="gap-3">
              <EmptyState
                icon={Camera}
                title={searchTerm.length >= 2 ? 'Chưa tìm thấy bài viết phù hợp' : 'Câu chuyện đầu tiên đang chờ bạn'}
                description={
                  searchTerm.length >= 2
                    ? 'Thử một từ khóa khác hoặc xóa tìm kiếm.'
                    : 'Chia sẻ một khoảnh khắc tập luyện, trận đấu hoặc câu chuyện thể thao của bạn.'
                }
              />
              <Button
                label={searchTerm.length >= 2 ? 'Xóa tìm kiếm' : 'Tạo bài viết'}
                onPress={() => (searchTerm.length >= 2 ? router.setParams({ search: undefined }) : setComposerOpen(true))}
                className="self-center"
              />
            </View>
          }
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="py-4" color="#537fff" /> : null}
        />
      )}

      <PostComposerModal visible={composerOpen} onClose={() => setComposerOpen(false)} />
    </ScreenContainer>
  );
}
