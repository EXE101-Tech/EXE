import { Text } from '@/components/ui/text';
import { FileText, Gamepad2, Trash2, TriangleAlert, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { PostMedia } from '@/components/social/post-media';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PopupModal } from '@/components/ui/popup-modal';
import {
  useAdminPostsQuery,
  useAdminRoomsQuery,
  useAdminTeamsQuery,
  useDeleteContentMutation,
  useSendWarningMutation,
  type ModeratedContent,
} from '@/hooks/queries/use-admin';
import type { ModerationTargetType } from '@/schemas/admin';
import {
  AdminRow,
  Segmented,
  ShowMoreButton,
  confirmAction,
  formatDateTimeVi,
  showError,
  useShowMore,
} from './admin-ui';

type ContentView = 'posts' | 'rooms' | 'teams';

interface WarningTarget {
  type: ModerationTargetType;
  id: number;
  label: string;
}

export function ContentSection({ notify }: { notify: (message: string) => void }) {
  const [view, setView] = useState<ContentView>('posts');
  const [warning, setWarning] = useState<WarningTarget | null>(null);
  const posts = useAdminPostsQuery();
  const rooms = useAdminRoomsQuery();
  const teams = useAdminTeamsQuery();
  const remove = useDeleteContentMutation();

  const askDelete = (type: ModeratedContent, id: number, label: string) =>
    confirmAction({
      title: 'Xóa nội dung',
      message: `Xóa ${label}? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      onConfirm: () =>
        remove.mutate(
          { type, id },
          { onSuccess: () => notify('Đã xóa nội dung.'), onError: (error) => showError(error, 'Không thể xóa nội dung.') },
        ),
    });

  const isDeleting = (type: ModeratedContent, id: number) =>
    remove.isPending && remove.variables?.type === type && remove.variables?.id === id;

  return (
    <View className="gap-4">
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'posts', label: 'Bài viết', icon: FileText, count: posts.data?.length },
          { value: 'rooms', label: 'Phòng chơi', icon: Gamepad2, count: rooms.data?.length },
          { value: 'teams', label: 'CLB', icon: Users, count: teams.data?.length },
        ]}
      />

      {view === 'posts' ? (
        <PostsList query={posts} onDelete={(id, label) => askDelete('post', id, label)} isDeleting={(id) => isDeleting('post', id)} />
      ) : view === 'rooms' ? (
        <RoomsList
          query={rooms}
          onDelete={(id, label) => askDelete('room', id, label)}
          isDeleting={(id) => isDeleting('room', id)}
          onWarn={(target) => setWarning(target)}
        />
      ) : (
        <TeamsList
          query={teams}
          onDelete={(id, label) => askDelete('team', id, label)}
          isDeleting={(id) => isDeleting('team', id)}
          onWarn={(target) => setWarning(target)}
        />
      )}

      {warning ? (
        <WarningModal
          target={warning}
          onClose={() => setWarning(null)}
          onSent={() => {
            setWarning(null);
            notify('Đã gửi cảnh báo cho người phụ trách.');
          }}
        />
      ) : null}
    </View>
  );
}

interface ListProps<TQuery> {
  query: TQuery;
  onDelete: (id: number, label: string) => void;
  isDeleting: (id: number) => boolean;
}

function DeleteButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <Button
      variant="outline"
      size="sm"
      loading={loading}
      onPress={onPress}
      accessibilityLabel="Xóa"
      className="flex-1 border-rose-400/50"
    >
      <Trash2 size={14} color="#E11D48" />
      <Text className="text-sm font-bold text-rose-600 dark:text-rose-400">Xóa</Text>
    </Button>
  );
}

function WarnButton({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="outline" size="sm" onPress={onPress} accessibilityLabel="Gửi cảnh báo" className="flex-1 border-amber-400/50">
      <TriangleAlert size={14} color="#D97706" />
      <Text className="text-sm font-bold text-amber-600 dark:text-amber-400">Cảnh báo</Text>
    </Button>
  );
}

function ListState({ isLoading, isError, empty, emptyLabel }: { isLoading: boolean; isError: boolean; empty: boolean; emptyLabel: string }) {
  if (isLoading) return <LoadingState label="Đang tải nội dung…" />;
  if (isError) return <EmptyState title="Không tải được nội dung" description="Kéo xuống để tải lại." />;
  if (empty) return <EmptyState title={emptyLabel} />;
  return null;
}

function PostsList({ query, onDelete, isDeleting }: ListProps<ReturnType<typeof useAdminPostsQuery>>) {
  const { visible, remaining, showMore } = useShowMore(query.data ?? []);
  return (
    <View className="gap-3">
      <ListState isLoading={query.isLoading} isError={query.isError} empty={visible.length === 0} emptyLabel="Chưa có bài viết." />
      {visible.map((post) => (
        <AdminRow key={post.id}>
          <View className="gap-1">
            <Text className="text-xs font-bold text-slate-400">
              #{post.id} · {formatDateTimeVi(post.created_at)}
            </Text>
            <Text className="font-bold text-slate-900 dark:text-white">{post.author_name}</Text>
            {post.content ? (
              <Text className="text-sm leading-5 text-slate-700 dark:text-slate-200" numberOfLines={6}>
                {post.content}
              </Text>
            ) : (
              <Text className="text-sm italic text-slate-400">Bài có ảnh/video</Text>
            )}
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              {post.like_count} lượt thích · {post.comment_count} bình luận
            </Text>
          </View>
          {post.media_url && post.media_type ? (
            <View className="overflow-hidden rounded-xl border border-border dark:border-border-dark">
              <PostMedia url={post.media_url} type={post.media_type} label={`Media trong bài viết của ${post.author_name}`} height={200} />
            </View>
          ) : null}
          <View className="flex-row gap-2">
            <DeleteButton loading={isDeleting(post.id)} onPress={() => onDelete(post.id, `bài viết #${post.id}`)} />
          </View>
        </AdminRow>
      ))}
      <ShowMoreButton remaining={remaining} onPress={showMore} />
    </View>
  );
}

const ROOM_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  OPEN: { label: 'Đang mở', variant: 'success' },
  FULL: { label: 'Đã đủ người', variant: 'warning' },
  PLAYING: { label: 'Đang diễn ra', variant: 'success' },
  CLOSED: { label: 'Đã đóng', variant: 'neutral' },
  FINISHED: { label: 'Đã kết thúc', variant: 'neutral' },
  CANCELLED: { label: 'Đã hủy', variant: 'danger' },
};

function RoomsList({
  query,
  onDelete,
  isDeleting,
  onWarn,
}: ListProps<ReturnType<typeof useAdminRoomsQuery>> & { onWarn: (target: WarningTarget) => void }) {
  const { visible, remaining, showMore } = useShowMore(query.data ?? []);
  return (
    <View className="gap-3">
      <ListState isLoading={query.isLoading} isError={query.isError} empty={visible.length === 0} emptyLabel="Chưa có phòng chơi." />
      {visible.map((room) => {
        const status = ROOM_STATUS[room.status] ?? { label: room.status, variant: 'neutral' as const };
        const host = room.host.profile?.full_name || room.host.email || 'Chủ phòng';
        return (
          <AdminRow key={room.id}>
            <View className="gap-1">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 font-bold text-slate-900 dark:text-white">{room.title}</Text>
                <Badge variant={status.variant} label={status.label} />
              </View>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                #{room.id} · {room.sport.name} · Chủ phòng: {host}
              </Text>
              {room.location ? (
                <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={2}>
                  {room.location}
                </Text>
              ) : null}
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                {formatDateTimeVi(room.start_time)} · {room.participants.length}/{room.max_players} người
              </Text>
              {room.description ? (
                <Text className="text-sm text-slate-700 dark:text-slate-200" numberOfLines={3}>
                  {room.description}
                </Text>
              ) : null}
            </View>
            <View className="flex-row gap-2">
              <WarnButton onPress={() => onWarn({ type: 'game_room', id: room.id, label: `phòng “${room.title}”` })} />
              <DeleteButton loading={isDeleting(room.id)} onPress={() => onDelete(room.id, `phòng “${room.title}”`)} />
            </View>
          </AdminRow>
        );
      })}
      <ShowMoreButton remaining={remaining} onPress={showMore} />
    </View>
  );
}

function TeamsList({
  query,
  onDelete,
  isDeleting,
  onWarn,
}: ListProps<ReturnType<typeof useAdminTeamsQuery>> & { onWarn: (target: WarningTarget) => void }) {
  const { visible, remaining, showMore } = useShowMore(query.data ?? []);
  return (
    <View className="gap-3">
      <ListState isLoading={query.isLoading} isError={query.isError} empty={visible.length === 0} emptyLabel="Chưa có CLB." />
      {visible.map((team) => (
        <AdminRow key={team.id}>
          <View className="gap-1">
            <Text className="font-bold text-slate-900 dark:text-white">{team.name}</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              #{team.id} · {team.sport_name} · Chủ CLB: {team.owner_name || '—'}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={2}>
              {team.location} · {team.member_count}/{team.total_slots} thành viên
            </Text>
            {team.description ? (
              <Text className="text-sm text-slate-700 dark:text-slate-200" numberOfLines={3}>
                {team.description}
              </Text>
            ) : null}
          </View>
          {team.image_url ? (
            <View className="overflow-hidden rounded-xl border border-border dark:border-border-dark">
              <PostMedia url={team.image_url} type="image" label={`Ảnh bìa CLB ${team.name}`} height={150} />
            </View>
          ) : null}
          <View className="flex-row gap-2">
            <WarnButton onPress={() => onWarn({ type: 'team', id: team.id, label: `CLB “${team.name}”` })} />
            <DeleteButton loading={isDeleting(team.id)} onPress={() => onDelete(team.id, `CLB “${team.name}”`)} />
          </View>
        </AdminRow>
      ))}
      <ShowMoreButton remaining={remaining} onPress={showMore} />
    </View>
  );
}

/** Sends a moderation warning; the owner gets it as a notification (the server resolves the recipient). */
function WarningModal({ target, onClose, onSent }: { target: WarningTarget; onClose: () => void; onSent: () => void }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const send = useSendWarningMutation();

  const submit = () => {
    const content = message.trim();
    if (!content) {
      setError('Vui lòng nhập nội dung cảnh báo.');
      return;
    }
    setError('');
    send.mutate(
      { target_type: target.type, target_id: target.id, message: content },
      { onSuccess: onSent, onError: (e) => setError(e instanceof Error ? e.message : 'Không gửi được cảnh báo.') },
    );
  };

  return (
    <PopupModal
      visible
      onClose={onClose}
      title="Gửi cảnh báo"
      subtitle={`Tới người phụ trách ${target.label}`}
      icon={TriangleAlert}
      iconColor="#D97706"
      dismissOnBackdrop={!send.isPending}
      footer={
        <View className="flex-row justify-end gap-2.5">
          <Button variant="outline" label="Hủy" onPress={onClose} disabled={send.isPending} />
          <Button label="Gửi cảnh báo" loading={send.isPending} onPress={submit} />
        </View>
      }
    >
      <Input
        value={message}
        onChangeText={setMessage}
        placeholder="Nội dung cảnh báo (tối đa 1000 ký tự)"
        multiline
        maxLength={1000}
        textAlignVertical="top"
        className="h-32 py-3"
        error={error}
      />
    </PopupModal>
  );
}
