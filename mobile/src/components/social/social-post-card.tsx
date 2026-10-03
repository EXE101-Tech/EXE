import { Text } from '@/components/ui/text';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Crown, Heart, MessageCircle, Pencil, Trash2, UserPlus, UserRoundCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { CommentsSection } from '@/components/social/comments-section';
import { PostMedia } from '@/components/social/post-media';
import {
  useAcceptFriendRequestMutation,
  useSendFriendRequestMutation,
  useStartConversationMutation,
} from '@/hooks/queries/use-chat';
import { useToggleLikeMutation } from '@/hooks/queries/use-social';
import { queryKeys } from '@/hooks/queries/keys';
import { toUtcEpoch } from '@/lib/slots';
import { cn } from '@/lib/utils';
import type { SocialPost } from '@/schemas/social';
import { showAlert } from '@/stores/dialog-store';
import { UserName } from '@/components/ui/user-name';

/** "HH:mm | dd/MM/yyyy" in Vietnam time, matching the web feed. */
function formatPostDate(value: string): string {
  const date = new Date(toUtcEpoch(value));
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
      .formatToParts(date)
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.hour}:${parts.minute} | ${parts.day}/${parts.month}/${parts.year}`;
}

interface SocialPostCardProps {
  post: SocialPost;
  currentUserId?: number;
  /** Shows edit/delete for the author (used on the profile, not in the shared feed). */
  canManage?: boolean;
  onEdit?: (post: SocialPost) => void;
  onDelete?: (post: SocialPost) => void;
}

const FRIEND_LABEL: Record<string, string> = {
  accepted: 'Nhắn tin',
  outgoing: 'Đã gửi lời mời',
  incoming: 'Chấp nhận',
};

export function SocialPostCard({ post, currentUserId, canManage = false, onEdit, onDelete }: SocialPostCardProps) {
  const queryClient = useQueryClient();
  const toggleLike = useToggleLikeMutation();
  const sendFriendRequest = useSendFriendRequestMutation();
  const acceptFriendRequest = useAcceptFriendRequestMutation();
  const startConversation = useStartConversationMutation();

  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const isMine = post.author_id === currentUserId;
  const premium = post.author_is_premium;
  const friendBusy = sendFriendRequest.isPending || acceptFriendRequest.isPending || startConversation.isPending;

  const handleLike = () => {
    if (toggleLike.isPending) return;
    toggleLike.mutate(
      { id: post.id, liked },
      {
        onSuccess: (result) => {
          setLiked(result.liked);
          setLikeCount(result.like_count);
        },
        onError: (error) => showAlert('Lỗi', error.message),
      },
    );
  };

  const refreshFeed = () => queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() });

  const handleFriend = async () => {
    if (friendBusy || post.friendship_status === 'outgoing') return;
    try {
      if (post.friendship_status === 'accepted') {
        const conversation = await startConversation.mutateAsync(post.author_id);
        router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } });
        return;
      }
      if (post.friendship_status === 'incoming' && post.friendship_id) {
        await acceptFriendRequest.mutateAsync(post.friendship_id);
      } else {
        await sendFriendRequest.mutateAsync(post.author_id);
      }
      await refreshFeed();
    } catch (error) {
      showAlert('Lỗi', error instanceof Error ? error.message : 'Không thể cập nhật lời mời kết bạn.');
    }
  };

  return (
    <Card>
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <Avatar
          uri={resolveMediaUrl(post.author_avatar_url)}
          fallback={post.author_name}
          size={premium ? 36 : 42}
          premium={premium}
        />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <UserName premium={premium} className="shrink text-sm font-extrabold" numberOfLines={1}>
              {post.author_name}
            </UserName>
            {premium ? <Crown size={12} color="#8b8cff" fill="#8b8cff" /> : null}
          </View>
          <Text className="text-xs text-slate-500 dark:text-slate-400">{formatPostDate(post.created_at)}</Text>
        </View>
        {!isMine ? (
          <Pressable
            onPress={handleFriend}
            disabled={friendBusy || post.friendship_status === 'outgoing'}
            className="flex-row items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 dark:bg-white/10"
            style={{ opacity: friendBusy || post.friendship_status === 'outgoing' ? 0.65 : 1 }}
          >
            {post.friendship_status === 'accepted' ? (
              <MessageCircle size={14} color="#537fff" />
            ) : post.friendship_status === 'outgoing' ? (
              <UserRoundCheck size={14} color="#64748B" />
            ) : (
              <UserPlus size={14} color="#537fff" />
            )}
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {FRIEND_LABEL[post.friendship_status] ?? 'Kết bạn'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {post.content ? (
        <Text className="px-4 pb-3 text-sm leading-6 text-slate-800 dark:text-slate-100">{post.content}</Text>
      ) : null}

      {post.media_url && post.media_type ? (
        <PostMedia url={post.media_url} type={post.media_type} label={`Ảnh trong bài viết của ${post.author_name}`} />
      ) : null}

      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-5">
          <Pressable onPress={handleLike} disabled={toggleLike.isPending} className="flex-row items-center gap-2">
            <Heart size={20} color={liked ? '#E11D48' : '#64748B'} fill={liked ? '#E11D48' : 'transparent'} />
            <Text className={cn('text-sm font-bold', liked ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300')}>
              Thích {likeCount}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setCommentsOpen((open) => !open)}
            accessibilityState={{ expanded: commentsOpen }}
            className="flex-row items-center gap-2"
          >
            <MessageCircle size={20} color={commentsOpen ? '#537fff' : '#64748B'} />
            <Text
              className={cn(
                'text-sm font-bold',
                commentsOpen ? 'text-brand dark:text-brand-dark' : 'text-slate-600 dark:text-slate-300',
              )}
            >
              Bình luận {commentCount}
            </Text>
          </Pressable>
        </View>
        {canManage && isMine ? (
          <View className="flex-row items-center gap-1">
            <Pressable onPress={() => onEdit?.(post)} accessibilityLabel="Chỉnh sửa bài viết" className="rounded-lg p-2" hitSlop={4}>
              <Pencil size={16} color="#64748B" />
            </Pressable>
            <Pressable onPress={() => onDelete?.(post)} accessibilityLabel="Xóa bài viết" className="rounded-lg p-2" hitSlop={4}>
              <Trash2 size={16} color="#E11D48" />
            </Pressable>
          </View>
        ) : null}
      </View>

      {commentsOpen ? <CommentsSection postId={post.id} isPostAuthor={isMine} onCountChange={setCommentCount} /> : null}
    </Card>
  );
}
