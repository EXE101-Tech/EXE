import { Text } from '@/components/ui/text';
import {
  Banknote,
  CalendarClock,
  Clock,
  Crown,
  Flag,
  MapPin,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { resolveMediaUrl } from '@/api/resolve-media-url';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ViewLocationModal } from '@/components/map/view-location-modal';
import { ReportModal } from '@/components/moderation/report-modal';
import { Card } from '@/components/ui/card';
import { SPORTS } from '@/lib/constants';
import { isPremiumUser } from '@/lib/premium';
import { parseStoredCostToVnd } from '@/lib/price';
import {
  availableSeats,
  formatDeadline,
  isDeadlinePassed,
  isInviteParticipant,
  isStartingSoon,
  timeLeftLabel,
} from '@/lib/seat-holds';
import { formatDateVi, formatTimeVi, isFutureTime } from '@/lib/slots';
import { cn } from '@/lib/utils';
import type { MatchResponse } from '@/schemas/gamerooms';
import { showAlert } from '@/stores/dialog-store';
import { UserName } from '@/components/ui/user-name';

interface GameroomCardProps {
  room: MatchResponse;
  currentUserId?: number;
  /** `waitlist` registers for the standby list of a seat-hold room that has no free seat. */
  onJoin: (mode: 'join' | 'waitlist') => void;
  onLeave: () => void;
  onManage: () => void;
  onChat: () => void;
  /** Accept an invitation (automatic Premium invite or standby invite) addressed to the current user. */
  onAcceptInvite: () => void;
  /** Decline an invitation addressed to the current user. */
  onDeclineInvite: () => void;
  /** Confirm the user's held seat in a seat-hold room before its deadline. */
  onConfirmSeat: () => void;
  isJoining?: boolean;
  isLeaving?: boolean;
  isResponding?: boolean;
}

/** Small notice above the card footer for the seat-hold states (invite, held seat, standby, expired). */
function SeatNotice({
  tone,
  children,
  action,
}: {
  tone: 'violet' | 'amber' | 'slate';
  children: ReactNode;
  action?: ReactNode;
}) {
  const palette =
    tone === 'violet'
      ? 'border-violet-300/40 bg-violet-400/10'
      : tone === 'amber'
        ? 'border-amber-400/40 bg-amber-400/10'
        : 'border-border bg-slate-50 dark:border-border-dark dark:bg-white/5';
  return (
    <View className={cn('gap-2 rounded-xl border px-3 py-2', palette)}>
      {children}
      {action}
    </View>
  );
}

const LEVEL_META: Record<string, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  Beginner: { label: 'Mới chơi', variant: 'success' },
  Intermediate: { label: 'Trung bình', variant: 'default' },
  Advanced: { label: 'Khá / Giỏi', variant: 'warning' },
  Expert: { label: 'Chuyên nghiệp', variant: 'danger' },
};

const CLOSED_STATUSES = ['CLOSED', 'CANCELLED', 'FINISHED'];

type Slot = { type: 'host' | 'player'; name: string; avatarUri?: string; premium: boolean } | { type: 'empty' };

/** Avatar with a ring: Premium users get the glowing ring, everyone else a plain border (host is amber). */
function SlotAvatar({ slot }: { slot: Exclude<Slot, { type: 'empty' }> }) {
  return (
    <View>
      {slot.premium ? (
        <Avatar uri={slot.avatarUri} fallback={slot.name} size={36} premium />
      ) : (
        <View
          style={{
            padding: 2,
            borderRadius: 22,
            borderWidth: 2,
            borderColor: slot.type === 'host' ? '#FBBF24' : '#CBD5E1',
          }}
        >
          <Avatar uri={slot.avatarUri} fallback={slot.name} size={36} />
        </View>
      )}
      {slot.type === 'host' ? (
        <View className="absolute -right-1 -top-1 rounded-full bg-amber-500 p-0.5">
          <Crown size={9} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

export function GameroomCard({
  room,
  currentUserId,
  onJoin,
  onLeave,
  onManage,
  onChat,
  onAcceptInvite,
  onDeclineInvite,
  onConfirmSeat,
  isJoining,
  isLeaving,
  isResponding,
}: GameroomCardProps) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const approvedParticipants = room.participants.filter((p) => p.status === 'APPROVED');
  const approvedCount = approvedParticipants.length;
  const holds = room.seat_holds_enabled;
  // Pending invitations already hold a seat in a seat-hold room, so the free-seat count comes from the server there.
  const emptyCount = holds ? availableSeats(room) : Math.max(0, room.max_players - approvedCount);
  const full = approvedCount >= room.max_players;
  const noSeats = holds ? emptyCount <= 0 : full;
  const closed = CLOSED_STATUSES.includes(room.status) || !isFutureTime(room.end_time);

  const isHost = room.host_id === currentUserId;
  const myParticipation = room.participants.find((p) => p.user_id === currentUserId);
  const isInvite = !isHost && isInviteParticipant(myParticipation);
  const isAutoInvite = isInvite && myParticipation?.invite_source === 'AUTO';
  const isWaitlisted = !isHost && myParticipation?.status === 'WAITLISTED';
  const isExpired = !isHost && myParticipation?.status === 'EXPIRED';
  const isPending = !isHost && !isInvite && myParticipation?.status === 'PENDING';
  const isJoined = !isHost && myParticipation?.status === 'APPROVED';
  // Requests that only the host's approval is missing; close to the start the host also needs an arrival time.
  const pendingCount = room.participants.filter((p) => p.status === 'PENDING' && !isInviteParticipant(p)).length;
  const inviteDeadline = isInvite ? myParticipation?.response_deadline : null;
  const inviteExpired = !!inviteDeadline && isDeadlinePassed(inviteDeadline);
  const heldUntil = holds && isJoined ? myParticipation?.response_deadline : null;
  const needsArrival =
    holds &&
    isPending &&
    isStartingSoon(room) &&
    (!myParticipation?.expected_arrival_at || isDeadlinePassed(myParticipation.expected_arrival_at));
  const summary = room.roster_summary;

  const hostName = room.host.profile?.full_name || room.host.email;
  const hostPremium = isPremiumUser(room.host);
  const location = room.location || room.court?.venue?.name;
  const venue = room.court?.venue;
  const venueCoords: [number, number] | null =
    venue?.latitude != null && venue?.longitude != null ? [venue.latitude, venue.longitude] : null;
  const level = LEVEL_META[room.required_level] ?? { label: room.required_level, variant: 'default' as const };
  const sportEmoji = SPORTS.find((s) => s.name.toLowerCase() === room.sport.name.toLowerCase())?.emoji ?? '🏅';
  const priceVnd = parseStoredCostToVnd(room.price_info);
  const priceLabel = priceVnd !== null ? `${priceVnd.toLocaleString('vi-VN')}đ/người` : room.price_info || 'Chia đều theo thực tế';

  const approvedNonHost = approvedParticipants.filter((p) => p.role !== 'HOST');
  const slots: Slot[] = Array.from({ length: room.max_players }, (_, index) => {
    if (index === 0) {
      return {
        type: 'host',
        name: hostName,
        avatarUri: resolveMediaUrl(room.host.profile?.avatar_url),
        premium: hostPremium,
      };
    }
    const participant = approvedNonHost[index - 1];
    if (!participant) return { type: 'empty' };
    return {
      type: 'player',
      name: participant.user.profile?.full_name || participant.user.email,
      avatarUri: resolveMediaUrl(participant.user.profile?.avatar_url),
      premium: isPremiumUser(participant.user),
    };
  });

  const canJoinEmptySlot = !isHost && !isJoined && !isPending && !isInvite && !isWaitlisted && !noSeats && !closed;

  return (
    <Card>
      <View className="gap-3 p-3.5">
        {/* Header: host avatar + name/crown on top, sport pill underneath, status badge on the right */}
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1 flex-row items-start gap-2.5">
            <Avatar uri={resolveMediaUrl(room.host.profile?.avatar_url)} fallback={hostName} size={40} premium={hostPremium} />
            <View className="flex-1 gap-1">
              <View className="flex-row flex-wrap items-center gap-1.5">
                <UserName premium={hostPremium} className="font-bold" numberOfLines={1}>
                  {hostName}
                </UserName>
                {hostPremium ? <Crown size={13} color="#8b8cff" fill="#8b8cff" /> : null}
                {isHost ? (
                  <View className="flex-row items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5">
                    <Crown size={11} color="#059669" />
                    <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Của bạn</Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1 self-start rounded-full bg-brand/10 px-2 py-0.5 dark:bg-brand-dark/15">
                <Text className="text-xs font-bold text-brand dark:text-brand-dark">
                  {sportEmoji} {room.sport.name}
                </Text>
              </View>
            </View>
          </View>

          <Badge
            variant={closed ? 'neutral' : full ? 'danger' : noSeats ? 'warning' : 'success'}
            label={
              closed ? 'Đã kết thúc' : full ? 'Đã đầy' : noSeats ? 'Đang chờ nhận chỗ' : 'Đang chờ người'
            }
          />
        </View>

        {/* Level & member count */}
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trình độ:</Text>
          <Badge variant={level.variant} label={level.label} />
          <Text className="text-slate-300 dark:text-slate-600">•</Text>
          <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Text className="font-black text-brand dark:text-brand-dark">
              {approvedCount}/{room.max_players}
            </Text>{' '}
            thành viên
          </Text>
        </View>

        <Text className="text-base font-black leading-tight text-slate-900 dark:text-white" numberOfLines={2}>
          {room.title}
        </Text>

        {room.description ? (
          <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={2}>
            {room.description}
          </Text>
        ) : null}

        {/* Date/time and location on separate rows, so a long venue address is not cut off */}
        <View className="gap-1.5">
          <View className="flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/5">
            <CalendarClock size={13} color="#3B82F6" />
            <Text className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200" numberOfLines={2}>
              {formatDateVi(room.start_time)} · {formatTimeVi(room.start_time)}–{formatTimeVi(room.end_time)}
            </Text>
          </View>
          {location ? (
            <Pressable
              onPress={() => setIsMapOpen(true)}
              accessibilityLabel="Xem vị trí trên bản đồ"
              className="flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 active:opacity-70 dark:bg-white/5"
            >
              <MapPin size={13} color="#F43F5E" />
              <Text className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200" numberOfLines={2}>
                {location}
              </Text>
              <Text className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Map
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Price */}
        <View className="flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/5">
          <Banknote size={13} color="#F59E0B" />
          <Text className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200" numberOfLines={1}>
            Chi phí/người: <Text className="font-black text-brand dark:text-brand-dark">{priceLabel}</Text>
          </Text>
        </View>

        {/* Lobby slots visualizer */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">Sảnh chờ người chơi:</Text>
            <Text className="text-xs font-bold text-brand dark:text-brand-dark">{emptyCount} chỗ trống</Text>
          </View>
          <View className="flex-row flex-wrap gap-2.5">
            {slots.map((slot, index) => {
              if (slot.type === 'empty') {
                return (
                  <Pressable
                    key={index}
                    disabled={!canJoinEmptySlot}
                    onPress={() => onJoin('join')}
                    className={cn(
                      'w-12 items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border py-2 dark:border-border-dark',
                      canJoinEmptySlot && 'active:bg-slate-50 dark:active:bg-white/5',
                    )}
                  >
                    <Plus size={14} color="#94A3B8" />
                    <Text className="text-[9px] font-semibold text-slate-400">Trống</Text>
                  </Pressable>
                );
              }
              return (
                <View key={index} className="w-12 items-center gap-1">
                  <SlotAvatar slot={slot} />
                  <UserName
                    premium={slot.premium}
                    className="text-[9px] font-bold"
                    plainColorClassName={
                      slot.type === 'host' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                    }
                    numberOfLines={1}
                  >
                    {slot.type === 'host' ? 'Host' : (slot.name.split(' ').pop() ?? '')}
                  </UserName>
                </View>
              );
            })}
          </View>
        </View>

        {holds ? (
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Text className="text-xs font-black text-brand dark:text-brand-dark">{summary?.confirmed ?? 0} đã xác nhận</Text>
            {` · ${summary?.waiting_confirmation ?? 0} chờ xác nhận`}
            {(summary?.invited ?? 0) > 0 ? ` · ${summary?.invited} suất đang mời` : ''}
            {` · ${summary?.waitlisted ?? 0} dự bị`}
          </Text>
        ) : null}

        {isInvite ? (
          <SeatNotice tone="violet">
            <View className="flex-row items-center gap-2">
              <Sparkles size={14} color="#8B5CF6" />
              <Text className="flex-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                {isAutoInvite
                  ? 'Bạn được mời tự động vì cùng khu vực hoạt động. Vui lòng phản hồi sớm.'
                  : 'Có suất trống cho bạn từ danh sách dự bị. Vui lòng phản hồi trước hạn.'}
              </Text>
            </View>
            {inviteDeadline ? (
              <Text className="text-xs font-bold text-violet-700 dark:text-violet-200">
                Hạn nhận chỗ: {formatDeadline(inviteDeadline)} · {timeLeftLabel(inviteDeadline)}
              </Text>
            ) : null}
          </SeatNotice>
        ) : null}

        {heldUntil ? (
          <SeatNotice
            tone="amber"
            action={
              <Button size="sm" disabled={closed} onPress={onConfirmSeat}>
                <ShieldCheck size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">Xác nhận sẽ đến</Text>
              </Button>
            }
          >
            <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Giữ chỗ đến <Text className="text-xs font-black">{formatDeadline(heldUntil)}</Text> ·{' '}
              {timeLeftLabel(heldUntil)}. Hãy xác nhận để giữ suất, hết hạn suất sẽ mở lại.
            </Text>
          </SeatNotice>
        ) : null}

        {needsArrival ? (
          <SeatNotice
            tone="amber"
            action={
              <Button size="sm" variant="outline" disabled={closed} onPress={() => onJoin('join')}>
                <Clock size={14} color="#D97706" />
                <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">Cập nhật giờ đến</Text>
              </Button>
            }
          >
            <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Buổi sắp bắt đầu: hãy cho chủ phòng biết giờ dự kiến đến để được duyệt.
            </Text>
          </SeatNotice>
        ) : null}

        {isWaitlisted ? (
          <SeatNotice
            tone="slate"
            action={
              isStartingSoon(room) && !closed ? (
                <Button size="sm" variant="outline" onPress={() => onJoin('waitlist')}>
                  <Clock size={14} color="#64748B" />
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">Cập nhật giờ đến</Text>
                </Button>
              ) : undefined
            }
          >
            <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {isStartingSoon(room)
                ? 'Buổi sắp bắt đầu: cho chủ phòng biết giờ dự kiến đến để được duyệt trực tiếp nếu có suất.'
                : 'Bạn đang trong danh sách dự bị. Khi có suất, hãy nhận lời mời đúng hạn.'}
            </Text>
          </SeatNotice>
        ) : null}

        {isExpired ? (
          <SeatNotice tone="slate">
            <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {myParticipation?.response_deadline
                ? 'Đã hết hạn giữ chỗ hoặc nhận lời mời. Bạn không bị tính bùng kèo; có thể đăng ký lại nếu còn chỗ.'
                : 'Yêu cầu tham gia đã hết hạn. Bạn có thể gửi lại nếu phòng còn chỗ.'}
            </Text>
          </SeatNotice>
        ) : null}

        {/* Footer actions */}
        <View className="flex-row items-center justify-end gap-2 border-t border-border pt-3 dark:border-border-dark">
          {!isHost ? (
            <Button variant="outline" size="icon" accessibilityLabel="Báo cáo chủ phòng" onPress={() => setIsReportOpen(true)}>
              <Flag size={15} color="#D97706" />
            </Button>
          ) : null}
          <Button variant="outline" size="icon" onPress={onChat}>
            <MessageCircle size={15} color="#537fff" />
          </Button>

          {isHost ? (
            <Button size="sm" onPress={onManage}>
              <UserCheck size={14} color="#fff" />
              <Text className="text-xs font-bold text-white">
                Quản lý phòng{pendingCount > 0 ? ` (${pendingCount} chờ)` : ''}
              </Text>
            </Button>
          ) : isInvite ? (
            <>
              <Button variant="outline" size="sm" disabled={closed} loading={isResponding} onPress={onDeclineInvite}>
                <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">Từ chối</Text>
              </Button>
              <Button
                size="sm"
                disabled={closed || inviteExpired || (!holds && full)}
                loading={isResponding}
                onPress={onAcceptInvite}
              >
                <Text className="text-xs font-bold text-white">{holds ? 'Nhận chỗ' : 'Nhận lời mời'}</Text>
              </Button>
            </>
          ) : isWaitlisted ? (
            <Button variant="outline" size="sm" loading={isLeaving} disabled={closed} onPress={onLeave}>
              <Clock size={14} color="#64748B" />
              <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">Đang dự bị · Hủy</Text>
            </Button>
          ) : isPending ? (
            <Button variant="outline" size="sm" loading={isLeaving} onPress={onLeave}>
              <Clock size={14} color="#D97706" />
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">Chờ duyệt</Text>
            </Button>
          ) : isJoined ? (
            <Button variant="outline" size="sm" loading={isLeaving} disabled={closed} onPress={onLeave}>
              <ShieldCheck size={14} color="#059669" />
              <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">Đã tham gia</Text>
            </Button>
          ) : closed ? (
            <Badge variant="neutral" label="Phòng đã kết thúc" />
          ) : holds && noSeats ? (
            <Button size="sm" loading={isJoining} onPress={() => onJoin('waitlist')}>
              <Clock size={14} color="#fff" />
              <Text className="text-xs font-bold text-white">Đăng ký dự bị</Text>
            </Button>
          ) : full ? (
            <Badge variant="danger" label="Phòng đã đầy" />
          ) : (
            <Button size="sm" loading={isJoining} onPress={() => onJoin('join')}>
              <Sparkles size={14} color="#fff" />
              <Text className="text-xs font-bold text-white">Tham gia</Text>
            </Button>
          )}
        </View>
      </View>
      {isMapOpen && location ? (
        <ViewLocationModal title={room.title} location={location} coords={venueCoords} onClose={() => setIsMapOpen(false)} />
      ) : null}
      {/* The API reports users, so a room is reported through its host, with the room named in the details. */}
      <ReportModal
        visible={isReportOpen}
        targetType="user"
        targetId={room.host_id}
        details={`Phòng #${room.id}: ${room.title}`.slice(0, 1000)}
        onClose={() => setIsReportOpen(false)}
        onSubmitted={() => showAlert('Đã gửi báo cáo', 'Quản trị viên SportGo sẽ xem xét phòng này.')}
      />
    </Card>
  );
}
