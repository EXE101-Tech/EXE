import { Text } from '@/components/ui/text';
import { CalendarDays, Clock3, Crown, MapPin, Star, Trophy, Users } from 'lucide-react-native';
import { Image, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { approvedPlayerCount } from '@/components/gamerooms/join-room-modal';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PopupModal } from '@/components/ui/popup-modal';
import { SKILL_REQUIREMENT_OPTIONS, SPORTS } from '@/lib/constants';
import { isPremiumUser } from '@/lib/premium';
import { formatStoredCost } from '@/lib/price';
import { formatDateVi, formatTimeVi } from '@/lib/slots';
import type { MatchResponse } from '@/schemas/gamerooms';
import type { TeamResponse } from '@/schemas/teams';

export type PreviewTarget = { type: 'room'; item: MatchResponse } | { type: 'team'; item: TeamResponse };

interface ContentPreviewModalProps {
  target: PreviewTarget;
  currentUserId?: number;
  isBusy?: boolean;
  onClose: () => void;
  /** Rooms continue into the join popup, clubs send the join request straight away. */
  onJoin: (target: PreviewTarget) => void;
}

const sportEmoji = (name: string) =>
  SPORTS.find((sport) => sport.name.toLowerCase() === name.toLowerCase())?.emoji ?? '🏅';

/** Quick look at a suggested room or club from the community feed (web: ContentPreviewModal). */
export function ContentPreviewModal({ target, currentUserId, isBusy = false, onClose, onJoin }: ContentPreviewModalProps) {
  const isRoom = target.type === 'room';
  const room = target.type === 'room' ? target.item : null;
  const team = target.type === 'team' ? target.item : null;

  const roomCount = room ? approvedPlayerCount(room) : 0;
  const roomSlots = room ? Math.max(0, room.max_players - roomCount) : 0;
  const isPending = room
    ? room.participants.some((p) => p.user_id === currentUserId && p.status === 'PENDING')
    : team?.membership_status === 'PENDING';
  const isFull = room ? roomSlots === 0 : (team?.member_count ?? 0) >= (team?.total_slots ?? 0);

  const sportName = room?.sport.name ?? team?.sport_name ?? 'Thể thao';
  const title = room?.title ?? team?.name ?? '';
  const description =
    room?.description ||
    team?.description ||
    (isRoom ? 'Tham gia phòng để cùng mọi người có một trận đấu vui vẻ.' : 'Một cộng đồng dành cho những người yêu thể thao.');
  const level = room
    ? (SKILL_REQUIREMENT_OPTIONS.find((o) => o.value === room.required_level)?.label ?? room.required_level)
    : '';

  const people = room
    ? [
        { key: `host-${room.host_id}`, name: room.host.profile?.full_name || room.host.email, avatar: room.host.profile?.avatar_url, premium: isPremiumUser(room.host) },
        ...room.participants
          .filter((p) => p.status === 'APPROVED' && p.role !== 'HOST' && p.user_id !== room.host_id)
          .map((p) => ({
            key: `p-${p.id}`,
            name: p.user.profile?.full_name || p.user.email,
            avatar: p.user.profile?.avatar_url,
            premium: isPremiumUser(p.user),
          })),
      ]
    : [];

  const actionLabel = isPending ? 'Đang chờ duyệt' : isFull ? 'Đã đủ người' : isRoom ? 'Tham gia ngay' : 'Tham gia CLB';

  return (
    <PopupModal
      visible
      onClose={onClose}
      title="Xem nhanh"
      subtitle={isRoom ? 'PHÒNG CHƠI' : 'CỘNG ĐỒNG THỂ THAO'}
      icon={isRoom ? undefined : Crown}
      dismissOnBackdrop={!isBusy}
      footer={
        <View className="flex-row justify-end gap-2.5">
          <Button variant="outline" label="Đóng" onPress={onClose} disabled={isBusy} />
          <Button
            label={actionLabel}
            loading={isBusy}
            disabled={isFull || isPending}
            onPress={() => onJoin(target)}
          />
        </View>
      }
    >
      {team?.image_url ? (
        <Image
          source={{ uri: resolveMediaUrl(team.image_url) }}
          style={{ width: '100%', height: 150, borderRadius: 16 }}
          resizeMode="cover"
        />
      ) : null}

      <View className="flex-row flex-wrap items-center gap-2">
        <Badge variant="neutral" label={`${sportEmoji(sportName)} ${sportName}`} />
        <Badge
          variant={isFull ? 'danger' : 'success'}
          label={
            room
              ? isFull
                ? 'Đã đủ người'
                : `${roomSlots} chỗ trống`
              : `${team?.member_count ?? 0}/${team?.total_slots ?? 0} thành viên`
          }
        />
      </View>

      <View className="gap-1.5">
        <Text className="text-xl font-black text-slate-900 dark:text-white">{title}</Text>
        <Text className="text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</Text>
      </View>

      {room ? (
        <>
          <View className="gap-2.5 rounded-2xl border border-border p-3.5 dark:border-border-dark">
            <MetaRow icon={<CalendarDays size={15} color="#3B82F6" />} text={formatDateVi(room.start_time)} />
            <MetaRow
              icon={<Clock3 size={15} color="#3B82F6" />}
              text={`${formatTimeVi(room.start_time)} – ${formatTimeVi(room.end_time)}`}
            />
            <MetaRow
              icon={<MapPin size={15} color="#F43F5E" />}
              text={room.location || room.court?.venue?.name || 'Địa điểm chưa cập nhật'}
            />
            <MetaRow icon={<Trophy size={15} color="#D97706" />} text={level} />
            <MetaRow icon={<Users size={15} color="#0EA5E9" />} text={`${roomCount}/${room.max_players} người`} />
            <MetaRow
              icon={<Text className="text-sm font-bold text-slate-500">₫</Text>}
              text={`Chi phí: ${formatStoredCost(room.price_info)}`}
            />
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-black text-slate-900 dark:text-white">Người tham gia</Text>
              <Text className="text-xs text-slate-400">{roomCount} đã duyệt</Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {people.map((person) => (
                <View key={person.key} className="w-16 items-center gap-1">
                  <Avatar uri={resolveMediaUrl(person.avatar)} fallback={person.name} size={44} premium={person.premium} />
                  <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-300" numberOfLines={1}>
                    {person.name.split(' ').pop()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : team ? (
        <View className="gap-2.5 rounded-2xl border border-border p-3.5 dark:border-border-dark">
          <MetaRow icon={<MapPin size={15} color="#F43F5E" />} text={team.location || 'Địa điểm chưa cập nhật'} />
          <MetaRow icon={<Users size={15} color="#0EA5E9" />} text={`${team.member_count}/${team.total_slots} thành viên`} />
          <MetaRow
            icon={<Star size={15} color="#F59E0B" />}
            text={
              team.rating_count > 0
                ? `${team.rating.toFixed(1)} · ${team.rating_count} đánh giá`
                : 'Chưa có đánh giá'
            }
          />
        </View>
      ) : null}
    </PopupModal>
  );
}

function MetaRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-start gap-2.5">
      <View className="w-4 items-center pt-0.5">{icon}</View>
      <Text className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{text}</Text>
    </View>
  );
}
