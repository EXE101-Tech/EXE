import { Text } from '@/components/ui/text';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { LoadingState } from '@/components/brand/loading-state';
import { PostComposerModal } from '@/components/social/post-composer-modal';
import { SocialPostCard } from '@/components/social/social-post-card';
import { useDeleteSocialPostMutation, useMySocialPostsQuery } from '@/hooks/queries/use-social';
import type { SocialPost } from '@/schemas/social';
import { useAuthStore } from '@/stores/auth-store';
import { showAlert } from '@/stores/dialog-store';

/** The "Bài viết của tôi" section of the profile: list, create, edit and delete own posts. */
export function MySocialPosts() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: posts, isLoading, isError, error } = useMySocialPostsQuery();
  const deletePost = useDeleteSocialPostMutation();

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  const openComposer = (post: SocialPost | null) => {
    setEditingPost(post);
    setComposerOpen(true);
  };

  const confirmDelete = (post: SocialPost) => {
    showAlert('Xóa bài viết', 'Bạn có chắc muốn xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deletePost.mutate(post.id, { onError: (e) => showAlert('Lỗi', e.message) }),
      },
    ]);
  };

  return (
    <View className="mt-6 border-t border-border pt-5 dark:border-border-dark">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Bài viết của tôi</Text>
        <Pressable
          onPress={() => openComposer(null)}
          className="flex-row items-center gap-1 rounded-full bg-brand px-3 py-2 dark:bg-brand-dark"
        >
          <Plus size={14} color="#fff" />
          <Text className="text-xs font-bold text-white">Đăng bài</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState label="Đang tải bài viết…" />
      ) : isError ? (
        <Text className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {error instanceof Error ? error.message : 'Không tải được bài viết của bạn.'}
        </Text>
      ) : !posts?.length ? (
        <Text className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-slate-500 dark:border-border-dark dark:text-slate-400">
          Bạn chưa có bài viết nào. Hãy chia sẻ điều gì đó với cộng đồng.
        </Text>
      ) : (
        <View className="gap-3">
          {posts.map((post) => (
            <SocialPostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              canManage
              onEdit={openComposer}
              onDelete={confirmDelete}
            />
          ))}
        </View>
      )}

      <PostComposerModal
        visible={composerOpen}
        post={editingPost}
        onClose={() => {
          setComposerOpen(false);
          setEditingPost(null);
        }}
      />
    </View>
  );
}
