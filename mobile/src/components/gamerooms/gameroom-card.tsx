import { Text } from '@/components/ui/text';
import {
  Banknote,
  CalendarClock,
  Clock,
  Crown,
  MapPin,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { resolveMediaUrl } from '@/api/resolve-media-url';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ViewLocationModal } from '@/components/map/view-location-modal';
import { Card } from '@/components/ui/card';
import { SPORTS } from '@/lib/constants';
import { isPremiumUser } from '@/lib/premium';
import { parseStoredCostToVnd } from '@/lib/price';
import { formatDateVi, formatTimeVi, isFutureTime } from '@/lib/slots';
import { cn } from '@/lib/utils';
import type { MatchResponse } from '@/schemas/gamerooms';
import { UserName } from '@/components/ui/user-name';

interface GameroomCardProps {
  room: MatchResponse;
  currentUserId?: number;
  onJoin: () => void;
  onLeave: () => void;
  onManage: () => void;
  onChat: () => void;
  /** Accept an automatic Premium invitation addressed to the current user. */
  onAcceptInvite: () => void;
  /** Decline an automatic Premium invitation addressed to the current user. */
  onDeclineInvite: () => void;
  isJoining?: boolean;
  isLeaving?: boolean;
  isResponding?: boolean;
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
  isJoining,
  isLeaving,
  isResponding,
}: GameroomCardProps) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const approvedParticipants = room.participants.filter((p) => p.status === 'APPROVED');
  const approvedCount = approvedParticipants.length;
  const pendingCount = room.participants.filter((p) => p.status === 'PENDING').length;
  const emptyCount = Math.max(0, room.max_players - approvedCount);
  const full = approvedCount >= room.max_players;
  const closed = CLOSED_STATUSES.includes(room.status) || !isFutureTime(room.end_time);

  const isHost = room.host_id === currentUserId;
  const myParticipation = room.participants.find((p) => p.user_id === currentUserId);
  const isAutoInvite = !isHost && myParticipation?.status === 'PENDING' && myParticipation?.invite_source === 'AUTO';
  const isPending = !isHost && !isAutoInvite && myParticipation?.status === 'PENDING';
  const isJoined = !isHost && myParticipation?.status === 'APPROVED';

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

  const canJoinEmptySlot = !isHost && !isJoined && !isPending && !isAutoInvite && !full && !closed;

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
            variant={closed ? 'neutral' : full ? 'danger' : 'success'}
            label={closed ? 'Đã kết thúc' : full ? 'Đã đầy' : 'Đang chờ người'}
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

        {/* Date/time + location on one row — time gets more width since its text runs longer */}
        <View className="flex-row gap-1.5">
          <View className="flex-[1.5] flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/5">
            <CalendarClock size={13} color="#3B82F6" />
            <Text className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200" numberOfLines={2}>
              {formatDateVi(room.start_time)} · {formatTimeVi(room.start_time)}–{formatTimeVi(room.end_time)}
            </Text>
          </View>
          {location ? (
            <Pressable
              onPress={() => setIsMapOpen(true)}
              accessibilityLabel="Xem vị trí trên bản đồ"
              className="flex-1 flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 active:opacity-70 dark:bg-white/5"
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
                    onPress={onJoin}
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

        {isAutoInvite ? (
          <View className="flex-row items-center gap-2 rounded-xl border border-violet-300/40 bg-violet-400/10 px-3 py-2">
            <Sparkles size={14} color="#8B5CF6" />
            <Text className="flex-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
              Bạn được mời tự động vì cùng khu vực hoạt động. Vui lòng phản hồi sớm.
            </Text>
          </View>
        ) : null}

        {/* Footer actions */}
        <View className="flex-row items-center justify-end gap-2 border-t border-border pt-3 dark:border-border-dark">
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
          ) : isAutoInvite ? (
            <>
              <Button variant="outline" size="sm" disabled={closed} loading={isResponding} onPress={onDeclineInvite}>
                <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">Từ chối</Text>
              </Button>
              <Button size="sm" disabled={closed || full} loading={isResponding} onPress={onAcceptInvite}>
                <Text className="text-xs font-bold text-white">Nhận lời mời</Text>
              </Button>
            </>
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
          ) : full ? (
            <Badge variant="danger" label="Phòng đã đầy" />
          ) : (
            <Button size="sm" loading={isJoining} onPress={onJoin}>
              <Sparkles size={14} color="#fff" />
              <Text className="text-xs font-bold text-white">Tham gia</Text>
            </Button>
          )}
        </View>
      </View>
      {isMapOpen && location ? (
        <ViewLocationModal title={room.title} location={location} coords={venueCoords} onClose={() => setIsMapOpen(false)} />
      ) : null}
    </Card>
  );
}
