import { Text } from '@/components/ui/text';
import { Check, Clock, Crown, Pencil, ShieldCheck, Trash2, UserCheck, UserX, Users } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { LoadingState } from '@/components/brand/loading-state';
import { Avatar } from '@/components/ui/avatar';
import { PopupModal } from '@/components/ui/popup-modal';
import {
  useDeleteGameroomMutation,
  useGameroomQuery,
  useSetGameroomParticipantStatusMutation,
  useUpdateAttendanceMutation,
} from '@/hooks/queries/use-gamerooms';
import { isPremiumUser } from '@/lib/premium';
import { isFutureTime } from '@/lib/slots';
import { cn } from '@/lib/utils';
import type { MatchAttendanceStatus, MatchParticipantResponse, MatchResponse } from '@/schemas/gamerooms';
import { showToast } from '@/stores/toast-store';
import { showAlert } from '@/stores/dialog-store';

interface GameroomManageModalProps {
  visible: boolean;
  roomId: number;
  onClose: () => void;
  onEdit: (room: MatchResponse) => void;
}

const CLOSED_STATUSES = ['CLOSED', 'CANCELLED', 'FINISHED'];

function SectionTitle({ icon: Icon, children }: { icon: typeof Clock; children: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-1.5">
      <Icon size={15} color="#537fff" />
      <Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</Text>
    </View>
  );
}

function PersonRow({
  participant,
  children,
}: {
  participant: MatchParticipantResponse;
  children?: React.ReactNode;
}) {
  const name = participant.user.profile?.full_name || participant.user.email;
  return (
    <View className="flex-row items-start gap-3 rounded-2xl border border-border p-3 dark:border-border-dark">
      <Avatar
        uri={resolveMediaUrl(participant.user.profile?.avatar_url)}
        fallback={name}
        size={36}
        premium={isPremiumUser(participant.user)}
      />
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
          {name}
        </Text>
        {children}
      </View>
    </View>
  );
}

/** Host-only room management: approve/reject requests, remove members, confirm attendance, edit and delete. */
export function GameroomManageModal({ visible, roomId, onClose, onEdit }: GameroomManageModalProps) {
  const { data: room, isLoading } = useGameroomQuery(roomId);
  const setStatus = useSetGameroomParticipantStatusMutation(roomId);
  const setAttendance = useUpdateAttendanceMutation(roomId);
  const deleteRoom = useDeleteGameroomMutation();

  const members = (room?.participants ?? []).filter((p) => p.role !== 'HOST');
  const pending = members.filter((p) => p.status === 'PENDING');
  const approved = members.filter((p) => p.status === 'APPROVED');
  const approvedCount = approved.length + 1; // the host always occupies a seat

  const hasEnded = room ? !isFutureTime(room.end_time) && room.status !== 'CANCELLED' : false;
  const isClosed = room ? CLOSED_STATUSES.includes(room.status) || hasEnded : false;
  const isFull = room ? approvedCount >= room.max_players : false;
  const busy = setStatus.isPending || setAttendance.isPending;

  const handleStatus = (userId: number, status: 'APPROVED' | 'REJECTED') =>
    setStatus.mutate(
      { userId, status },
      {
        onSuccess: () => showToast(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} thành viên.`),
        onError: (error) => showAlert('Lỗi', error.message),
      },
    );

  const handleAttendance = (userId: number, status: MatchAttendanceStatus) =>
    setAttendance.mutate(
      { userId, status },
      {
        onSuccess: () =>
          showToast(
            status === 'ATTENDED' ? 'Đã xác nhận người chơi tham gia trận.' : 'Đã ghi nhận người chơi không tham gia.',
          ),
        onError: (error) => showAlert('Lỗi', error.message),
      },
    );

  const confirmDelete = () => {
    if (!room) return;
    showAlert('Xóa phòng', `Xóa phòng "${room.title}"? Các thành viên đã tham gia sẽ nhận được thông báo.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa phòng',
        style: 'destructive',
        onPress: () =>
          deleteRoom.mutate(room.id, {
            onSuccess: () => {
              onClose();
              showToast('Đã xóa phòng. Thành viên trong phòng đã được thông báo.');
            },
            onError: (error) => showAlert('Lỗi', error.message),
          }),
      },
    ]);
  };

  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title="Quản lý phòng chờ"
      subtitle={room?.title}
      icon={UserCheck}
      bodyClassName="gap-6"
      footer={
        room ? (
          <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          {!isClosed ? (
            <Pressable
              disabled={busy || deleteRoom.isPending}
              onPress={() => onEdit(room)}
              className="flex-row items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 dark:border-border-dark"
            >
              <Pencil size={14} color="#64748B" />
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">Chỉnh sửa</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={busy || deleteRoom.isPending}
            onPress={confirmDelete}
            className="flex-row items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2.5"
          >
            <Trash2 size={14} color="#E11D48" />
            <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">Xóa phòng</Text>
          </Pressable>
        </View>
        <Pressable onPress={onClose} className="rounded-xl bg-brand px-5 py-2.5 dark:bg-brand-dark">
          <Text className="text-xs font-bold text-white">Đóng</Text>
        </Pressable>
          </View>
        ) : undefined
      }
    >
      {isLoading || !room ? (
        <LoadingState label="Đang tải…" />
      ) : (
        <>
      <View className="flex-row items-center justify-between rounded-2xl border border-border bg-slate-50 p-4 dark:border-border-dark dark:bg-white/5">
        <View className="flex-row items-center gap-2">
          <Users size={16} color="#537fff" />
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">Sĩ số phòng hiện tại:</Text>
        </View>
        <Text className="text-sm font-black text-brand dark:text-brand-dark">
          {approvedCount} / {room.max_players} thành viên
        </Text>
      </View>

      <View>
        <SectionTitle icon={Clock}>{`Danh sách chờ duyệt (${pending.length})`}</SectionTitle>
        {pending.length === 0 ? (
          <Text className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-slate-400 dark:border-border-dark">
            Hiện không có yêu cầu xin gia nhập nào đang chờ duyệt.
          </Text>
        ) : (
          <View className="gap-2.5">
            {pending.map((participant) => (
              <PersonRow key={participant.id} participant={participant}>
                <Text className="mt-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  {participant.invite_source === 'AUTO' ? 'Đã mời tự động, chờ phản hồi' : 'Vừa xin gia nhập'}
                </Text>
                {participant.invite_source !== 'AUTO' ? (
                  <View className="mt-2 flex-row gap-2">
                    <Pressable
                      disabled={busy || isClosed}
                      onPress={() => handleStatus(participant.user_id, 'REJECTED')}
                      className="flex-row items-center gap-1 rounded-xl bg-rose-500/10 px-3 py-1.5"
                      style={{ opacity: busy || isClosed ? 0.5 : 1 }}
                    >
                      <UserX size={13} color="#E11D48" />
                      <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">Từ chối</Text>
                    </Pressable>
                    <Pressable
                      disabled={busy || isClosed || isFull}
                      onPress={() => handleStatus(participant.user_id, 'APPROVED')}
                      className="flex-row items-center gap-1 rounded-xl bg-brand px-3 py-1.5 dark:bg-brand-dark"
                      style={{ opacity: busy || isClosed || isFull ? 0.5 : 1 }}
                    >
                      <Check size={13} color="#fff" />
                      <Text className="text-xs font-bold text-white">Duyệt vào</Text>
                    </Pressable>
                  </View>
                ) : null}
              </PersonRow>
            ))}
          </View>
        )}
      </View>

      <View>
        <SectionTitle icon={ShieldCheck}>{`Thành viên chính thức (${approvedCount})`}</SectionTitle>
        <View className="gap-2.5">
          <View className="flex-row items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3">
            <Avatar
              uri={resolveMediaUrl(room.host.profile?.avatar_url)}
              fallback={room.host.profile?.full_name || room.host.email}
              size={36}
              premium={isPremiumUser(room.host)}
            />
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                {room.host.profile?.full_name || room.host.email}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <Crown size={11} color="#D97706" />
                <Text className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Chủ phòng</Text>
              </View>
            </View>
          </View>

          {approved.map((participant) => (
            <PersonRow key={participant.id} participant={participant}>
              <Text className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                ✔ Thành viên chính thức
              </Text>
              {hasEnded ? (
                <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
                  <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Kết quả:</Text>
                  {(
                    [
                      { value: 'ATTENDED', label: 'Đã tham gia', active: 'border-emerald-500/40 bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
                      { value: 'ABSENT', label: 'Không tham gia', active: 'border-rose-500/40 bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400' },
                    ] as const
                  ).map((option) => {
                    const active = participant.attendance_status === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        disabled={busy}
                        onPress={() => handleAttendance(participant.user_id, option.value)}
                        className={cn(
                          'rounded-lg border px-2 py-1',
                          active ? option.active : 'border-border dark:border-border-dark',
                        )}
                        style={{ opacity: busy ? 0.6 : 1 }}
                      >
                        <Text
                          className={cn(
                            'text-[10px] font-bold',
                            active ? option.text : 'text-slate-500 dark:text-slate-400',
                          )}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {!isClosed ? (
                <Pressable
                  disabled={busy}
                  onPress={() => handleStatus(participant.user_id, 'REJECTED')}
                  className="mt-2 self-start"
                  style={{ opacity: busy ? 0.5 : 1 }}
                >
                  <Text className="text-xs font-semibold text-rose-500">Xóa khỏi phòng</Text>
                </Pressable>
              ) : null}
            </PersonRow>
          ))}
        </View>
      </View>
        </>
      )}
    </PopupModal>
  );
}
