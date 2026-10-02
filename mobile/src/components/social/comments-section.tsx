import { Text } from '@/components/ui/text';
import { Pencil, Send, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { Avatar } from '@/components/ui/avatar';
import { useSocialCommentMutations, useSocialCommentsQuery } from '@/hooks/queries/use-social';
import { cn } from '@/lib/utils';
import { COMMENT_REACTIONS, type SocialComment } from '@/schemas/social';
import { useAuthStore } from '@/stores/auth-store';
import { showAlert } from '@/stores/dialog-store';

interface CommentsSectionProps {
  postId: number;
  /** The post author may delete any comment under their post. */
  isPostAuthor: boolean;
  /** Reports the real comment total so the card can keep its counter in sync. */
  onCountChange?: (count: number) => void;
}

/** Comments shown inline under a post (mirrors the web card): list, replies, reactions and the composer. */
export function CommentsSection({ postId, isPostAuthor, onCountChange }: CommentsSectionProps) {
  const user = useAuthStore((s) => s.user);
  const { data: comments, isLoading } = useSocialCommentsQuery(postId, true);
  const { add, update, remove, react } = useSocialCommentMutations(postId);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<SocialComment | null>(null);
  const [editing, setEditing] = useState<SocialComment | null>(null);
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const all = comments ?? [];
  const roots = all.filter((comment) => comment.parent_id == null);
  const repliesByParent = new Map<number, SocialComment[]>();
  all.forEach((comment) => {
    if (comment.parent_id == null) return;
    repliesByParent.set(comment.parent_id, [...(repliesByParent.get(comment.parent_id) ?? []), comment]);
  });

  const total = comments?.length;
  useEffect(() => {
    if (total != null) onCountChange?.(total);
  }, [total, onCountChange]);

  const resetComposer = () => {
    setText('');
    setReplyTo(null);
    setEditing(null);
  };

  const submit = () => {
    const content = text.trim();
    if (!content) return;
    const onError = (error: Error) => showAlert('Lỗi', error.message);
    if (editing) {
      update.mutate({ commentId: editing.id, content }, { onSuccess: resetComposer, onError });
    } else {
      add.mutate({ content, parentId: replyTo?.id ?? null }, { onSuccess: resetComposer, onError });
    }
  };

  const confirmRemove = (comment: SocialComment) => {
    showAlert('Xóa bình luận', 'Bạn có chắc muốn xóa bình luận này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          if (editing?.id === comment.id || replyTo?.id === comment.id) resetComposer();
          remove.mutate(comment.id, { onError: (error) => showAlert('Lỗi', error.message) });
        },
      },
    ]);
  };

  const setReaction = (comment: SocialComment, reaction: string) => {
    react.mutate(
      { commentId: comment.id, reaction, clear: comment.my_reaction === reaction },
      { onError: (error) => showAlert('Lỗi', error.message) },
    );
    setPickerFor(null);
  };

  const renderComment = (comment: SocialComment, isReply = false) => {
    const mine = comment.author_id === user?.id;
    const selectedReaction = COMMENT_REACTIONS.find((item) => item.key === comment.my_reaction);
    const counts = comment.reaction_counts ?? {};
    const replies = repliesByParent.get(comment.id) ?? [];

    return (
      <View key={comment.id} className={cn(isReply && 'ml-9 mt-3 border-l border-border pl-3 dark:border-border-dark')}>
        <View className="flex-row items-start gap-2.5">
          <Avatar uri={resolveMediaUrl(comment.author_avatar_url)} fallback={comment.author_name} size={isReply ? 28 : 34} />
          <View className="flex-1 rounded-2xl bg-slate-50 px-3.5 py-2.5 dark:bg-white/5">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-[13px] font-extrabold text-slate-800 dark:text-white" numberOfLines={1}>
                {comment.author_name}
              </Text>
              <View className="flex-row items-center gap-3">
                {mine ? (
                  <Pressable
                    hitSlop={8}
                    accessibilityLabel="Sửa bình luận"
                    onPress={() => {
                      setReplyTo(null);
                      setEditing(comment);
                      setText(comment.content);
                    }}
                  >
                    <Pencil size={13} color="#94A3B8" />
                  </Pressable>
                ) : null}
                {mine || isPostAuthor ? (
                  <Pressable hitSlop={8} accessibilityLabel="Xóa bình luận" onPress={() => confirmRemove(comment)}>
                    <Trash2 size={13} color="#94A3B8" />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <Text className="mt-0.5 text-sm leading-5 text-slate-700 dark:text-slate-200">{comment.content}</Text>

            <View className="mt-2 flex-row flex-wrap items-center gap-x-3.5 gap-y-1">
              {!isReply ? (
                <Pressable
                  hitSlop={6}
                  onPress={() => {
                    setEditing(null);
                    setText('');
                    setReplyTo(comment);
                  }}
                >
                  <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Trả lời{replies.length ? ` · ${replies.length}` : ''}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable hitSlop={6} onPress={() => setPickerFor((current) => (current === comment.id ? null : comment.id))}>
                <Text
                  className={cn(
                    'text-xs font-bold',
                    selectedReaction ? 'text-brand dark:text-brand-dark' : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {selectedReaction ? `${selectedReaction.emoji} ${selectedReaction.label}` : 'Cảm xúc'}
                </Text>
              </Pressable>
              {COMMENT_REACTIONS.filter((item) => counts[item.key]).map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setReaction(comment, item.key)}
                  className={cn(
                    'rounded-full bg-white/80 px-1.5 py-0.5 dark:bg-white/10',
                    comment.my_reaction === item.key && 'border border-brand dark:border-brand-dark',
                  )}
                >
                  <Text className="text-[11px]">
                    {item.emoji} {counts[item.key]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {pickerFor === comment.id ? (
              <View className="mt-2 flex-row items-center gap-1 self-start rounded-full border border-border bg-white p-1 dark:border-border-dark dark:bg-[#111827]">
                {COMMENT_REACTIONS.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityLabel={item.label}
                    onPress={() => setReaction(comment, item.key)}
                    className="rounded-full p-1.5"
                  >
                    <Text className="text-base">{item.emoji}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        {!isReply ? replies.map((reply) => renderComment(reply, true)) : null}
      </View>
    );
  };

  const busy = add.isPending || update.isPending;
  const hint = editing ? 'Đang chỉnh sửa bình luận' : replyTo ? `Đang trả lời ${replyTo.author_name}` : null;

  return (
    <View className="px-4 pb-4 pt-1">
      {isLoading ? (
        <View className="items-center py-5">
          <ActivityIndicator size="small" color="#537fff" />
        </View>
      ) : roots.length === 0 ? (
        <Text className="py-5 text-center text-sm text-slate-500 dark:text-slate-400">
          Chưa có bình luận. Hãy bắt đầu trò chuyện nhé.
        </Text>
      ) : (
        <View className="gap-3.5 py-2">{roots.map((comment) => renderComment(comment))}</View>
      )}

      {hint ? (
        <View className="mb-2 mt-1 flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-brand dark:text-brand-dark">{hint}</Text>
          <Pressable hitSlop={8} accessibilityLabel="Hủy" onPress={resetComposer}>
            <X size={14} color="#94A3B8" />
          </Pressable>
        </View>
      ) : null}

      <View className="mt-2 flex-row items-center gap-2.5">
        <Avatar uri={user?.profile?.avatar_url} fallback={user?.name ?? 'U'} size={34} premium={user?.isPremium} />
        <TextInput
          value={text}
          onChangeText={setText}
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={submit}
          placeholder={replyTo ? `Trả lời ${replyTo.author_name}…` : 'Viết bình luận…'}
          placeholderTextColor="#94A3B8"
          className="h-11 flex-1 rounded-full border border-border bg-slate-50 px-4 text-sm text-slate-900 dark:border-border-dark dark:bg-[#0d1424] dark:text-white"
        />
        <Pressable
          onPress={submit}
          disabled={!text.trim() || busy}
          accessibilityLabel="Gửi bình luận"
          className="h-11 w-11 items-center justify-center rounded-full bg-brand dark:bg-brand-dark"
          style={{ opacity: !text.trim() || busy ? 0.5 : 1 }}
        >
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <Send size={17} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );
}
