import { Text } from '@/components/ui/text';
import {
  Calendar,
  Check,
  Clock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Trophy,
  TriangleAlert,
  Users,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/ui/date-time-field';
import { ViewLocationModal } from '@/components/map/view-location-modal';
import { Input } from '@/components/ui/input';
import { PopupModal } from '@/components/ui/popup-modal';
import { SKILL_REQUIREMENT_OPTIONS } from '@/lib/constants';
import { formatStoredCost } from '@/lib/price';
import {
  arrivalToIso,
  defaultArrivalTime,
  formatDeadline,
  isDeadlinePassed,
  isStartingSoon,
  timeLeftLabel,
  type JoinConsent,
} from '@/lib/seat-holds';
import { formatDateVi, formatTimeVi } from '@/lib/slots';
import type { MatchResponse } from '@/schemas/gamerooms';

/**
 * `join`: ask for a seat. `waitlist`: standby list of a full seat-hold room. `accept`: take a seat the host
 * invited you to. `confirm`: confirm an approved seat before its deadline.
 */
export type JoinMode = 'join' | 'waitlist' | 'accept' | 'confirm';

interface JoinRoomModalProps {
  room: MatchResponse;
  mode?: JoinMode;
  /** For `accept` / `confirm`: when the invitation or the held seat runs out. */
  deadline?: string | null;
  isLoading?: boolean;
  onClose: () => void;
  /** Receives the optional message for the host and, for seat-hold rooms, the consent the server asks for. */
  onConfirm: (note: string, consent?: JoinConsent) => void;
}

/** Approved players other than the host, plus the host, as the web "Xác nhận tham gia phòng" popup counts them. */
export function approvedPlayerCount(room: MatchResponse): number {
  const approved = room.participants.filter(
    (participant) =>
      participant.status === 'APPROVED' && participant.role !== 'HOST' && participant.user_id !== room.host_id,
  ).length;
  return approved + 1;
}

const COPY: Record<JoinMode, { title: string; subtitle: string; action: string }> = {
  join: { title: 'Xác nhận tham gia phòng', subtitle: 'Gia nhập nhóm và chuẩn bị thi đấu', action: 'Xác nhận tham gia' },
  waitlist: { title: 'Đăng ký chơi dự bị', subtitle: 'Nhận lời mời khi có suất trống', action: 'Đăng ký dự bị' },
  accept: { title: 'Xác nhận lời mời', subtitle: 'Nhận chỗ và xác nhận sẽ đến', action: 'Nhận chỗ' },
  confirm: { title: 'Xác nhận sẽ đến', subtitle: 'Giữ chỗ của bạn trong buổi chơi', action: 'Xác nhận sẽ đến' },
};

/** Room summary, an optional note to the host and, for seat-hold rooms, the hold rules to agree to. */
export function JoinRoomModal({
  room,
  mode = 'join',
  deadline,
  isLoading = false,
  onClose,
  onConfirm,
}: JoinRoomModalProps) {
  const [note, setNote] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [arrival, setArrival] = useState(() => defaultArrivalTime(room));

  const holds = room.seat_holds_enabled;
  const asksNote = mode === 'join' || mode === 'waitlist';
  const needsArrival = holds && asksNote && isStartingSoon(room);
  const arrivalIso = needsArrival ? arrivalToIso(arrival, room) : null;
  const arrivalInvalid = needsArrival && !arrivalIso;
  const expired = (mode === 'accept' || mode === 'confirm') && !!deadline && isDeadlinePassed(deadline);
  const copy = COPY[mode];
  const title = holds && mode === 'join' ? 'Gửi yêu cầu tham gia phòng' : copy.title;

  const levelLabel =
    SKILL_REQUIREMENT_OPTIONS.find((option) => option.value === room.required_level)?.label ?? room.required_level;
  const hostName = room.host.profile?.full_name || room.host.email;
  const location = room.location || room.court?.venue?.name || room.court?.venue?.address;
  const venue = room.court?.venue;
  const venueCoords: [number, number] | null =
    venue?.latitude != null && venue?.longitude != null ? [venue.latitude, venue.longitude] : null;

  const handleConfirm = () => {
    const consent: JoinConsent | undefined = holds
      ? { accepted_hold_policy: true, terms_version: room.terms_version ?? null, expected_arrival_at: arrivalIso }
      : undefined;
    onConfirm(note.trim(), consent);
  };

  return (
    <PopupModal
      visible
      onClose={onClose}
      title={title}
      subtitle={copy.subtitle}
      icon={Sparkles}
      dismissOnBackdrop={!isLoading}
      footer={
        <View className="flex-row justify-end gap-2.5">
          <Button variant="outline" label="Hủy" onPress={onClose} disabled={isLoading} />
          <Button
            loading={isLoading}
            disabled={expired || arrivalInvalid || (holds && !accepted)}
            onPress={handleConfirm}
          >
            <ShieldCheck size={16} color="#fff" />
            <Text className="text-base font-bold text-white">{copy.action}</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-3 rounded-2xl border border-border bg-slate-50 p-4 dark:border-border-dark dark:bg-white/5">
        <View className="flex-row items-center justify-between gap-2">
          <Badge variant="neutral" label={room.sport.name} />
          <View className="flex-row items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1">
            <Trophy size={12} color="#D97706" />
            <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">{levelLabel}</Text>
          </View>
        </View>

        <Text className="text-base font-black leading-snug text-slate-900 dark:text-white">{room.title}</Text>

        <View className="gap-2">
          <View className="flex-row items-start gap-2">
            <Users size={15} color="#0EA5E9" />
            <Text className="flex-1 text-sm text-slate-800 dark:text-slate-100">
              <Text className="text-sm font-bold text-slate-600 dark:text-slate-300">Chủ phòng: </Text>
              <Text className="text-sm font-black">{hostName}</Text>
              {` (${approvedPlayerCount(room)}/${room.max_players} thành viên)`}
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Calendar size={15} color="#059669" />
            <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-white">
              {formatDateVi(room.start_time)} · {formatTimeVi(room.start_time)} – {formatTimeVi(room.end_time)}
            </Text>
          </View>
          {location ? (
            <View className="gap-1.5">
              <View className="flex-row items-start gap-2">
                <MapPin size={15} color="#F43F5E" />
                <Text className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{location}</Text>
              </View>
              {/* Under the address (aligned with its text), so the address keeps the whole row width. */}
              <Pressable
                onPress={() => setIsMapOpen(true)}
                accessibilityLabel="Xem vị trí sân trên bản đồ"
                className="ml-6 flex-row items-center gap-1 self-start rounded-xl bg-emerald-500/10 px-2.5 py-1"
              >
                <MapPin size={12} color="#059669" />
                <Text className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Xem map</Text>
              </Pressable>
            </View>
          ) : null}
          <Text className="text-sm text-slate-800 dark:text-slate-100">
            <Text className="text-sm font-bold text-slate-600 dark:text-slate-300">Chi phí/người: </Text>
            <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatStoredCost(room.price_info)}
            </Text>
          </Text>
        </View>
      </View>

      <View className="flex-row items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5">
        <TriangleAlert size={18} color="#F59E0B" />
        <Text className="flex-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
          <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">Lưu ý về trình độ & thái độ: </Text>
          Vui lòng tự đánh giá đúng trình độ <Text className="text-xs font-black underline">{levelLabel}</Text> để đảm
          bảo trải nghiệm thi đấu vui vẻ, cân kèo cho toàn bộ các thành viên trong phòng.
        </Text>
      </View>

      {asksNote ? (
        <View className="gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <MessageSquare size={13} color="#059669" />
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Lời nhắn đến trưởng phòng (không bắt buộc)
            </Text>
          </View>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="VD: Mình có đem theo vợt và cầu phụ, mình đến đúng giờ nhé!"
            maxLength={500}
            multiline
            textAlignVertical="top"
            className="h-24 py-3"
          />
        </View>
      ) : null}

      {holds ? (
        <View className="gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-3.5 dark:border-brand-dark/40 dark:bg-brand-dark/10">
          <View className="gap-1.5">
            {mode === 'join' ? (
              <Text className="text-xs leading-5 text-slate-700 dark:text-slate-200">
                <Text className="text-xs font-bold">Phòng có hạn giữ chỗ.</Text> Sau khi được duyệt, xác nhận trước 2
                giờ trước buổi chơi để giữ suất. Nếu được duyệt muộn, bạn có ít nhất 15 phút; còn 30–60 phút có 5
                phút. Hết hạn chưa xác nhận, chỗ sẽ mở lại và không tính bùng kèo.
              </Text>
            ) : null}
            {mode === 'waitlist' ? (
              <Text className="text-xs leading-5 text-slate-700 dark:text-slate-200">
                <Text className="text-xs font-bold">Đăng ký dự bị chưa phải cam kết tham gia.</Text> Khi có suất, bạn
                nhận lời mời có hạn 15 phút hoặc 5 phút tùy thời gian còn lại. Dưới 30 phút, chủ phòng quyết định
                trực tiếp.
              </Text>
            ) : null}
            {mode === 'accept' ? (
              <Text className="text-xs leading-5 text-slate-700 dark:text-slate-200">
                <Text className="text-xs font-bold">Nhận chỗ đồng thời xác nhận sẽ đến.</Text>
                {deadline ? ` Hạn nhận chỗ: ${formatDeadline(deadline)}.` : ''} Hết hạn sẽ chuyển lượt, không ảnh
                hưởng uy tín.
              </Text>
            ) : null}
            {mode === 'confirm' ? (
              <Text className="text-xs leading-5 text-slate-700 dark:text-slate-200">
                <Text className="text-xs font-bold">Xác nhận để giữ suất</Text>
                {deadline ? ` trước ${formatDeadline(deadline)}.` : '.'} Hết hạn chưa xác nhận, suất sẽ mở lại; chưa
                xác nhận không bị tính bùng kèo.
              </Text>
            ) : null}
            {deadline && (mode === 'accept' || mode === 'confirm') ? (
              <Text className="text-xs font-black text-brand dark:text-brand-dark">{timeLeftLabel(deadline)}</Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => setAccepted((value) => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            className="flex-row items-start gap-2.5"
          >
            <View
              className="mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 border-brand dark:border-brand-dark"
              style={{ backgroundColor: accepted ? '#537fff' : 'transparent' }}
            >
              {accepted ? <Check size={16} color="#fff" /> : null}
            </View>
            <Text className="flex-1 text-sm leading-5 text-slate-800 dark:text-slate-100">
              {mode === 'accept' || mode === 'confirm'
                ? 'Tôi đã đọc giờ chơi, địa điểm, chi phí và xác nhận sẽ đến.'
                : 'Tôi đã đọc và đồng ý quy định giữ chỗ có thời hạn.'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {needsArrival ? (
        <View className="gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <Clock size={13} color="#059669" />
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Dự kiến đến sân lúc
            </Text>
          </View>
          <DateTimeField mode="time" value={arrival} onChange={setArrival} />
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            Buổi sắp bắt đầu. Chủ phòng cần biết giờ bạn đến trước khi duyệt.
          </Text>
          {arrivalInvalid ? (
            <Text className="text-xs font-semibold text-rose-500">
              Giờ dự kiến đến phải từ bây giờ đến trước khi buổi chơi kết thúc.
            </Text>
          ) : null}
        </View>
      ) : null}

      {expired ? (
        <Text className="text-xs font-semibold text-rose-500">
          Đã hết hạn. Hãy đóng và tải lại danh sách phòng.
        </Text>
      ) : null}

      {isMapOpen && location ? (
        <ViewLocationModal title={room.title} location={location} coords={venueCoords} onClose={() => setIsMapOpen(false)} />
      ) : null}
    </PopupModal>
  );
}
