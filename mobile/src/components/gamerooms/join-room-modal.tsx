import { Text } from '@/components/ui/text';
import { Calendar, MapPin, MessageSquare, ShieldCheck, Sparkles, Trophy, TriangleAlert, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ViewLocationModal } from '@/components/map/view-location-modal';
import { Input } from '@/components/ui/input';
import { PopupModal } from '@/components/ui/popup-modal';
import { SKILL_REQUIREMENT_OPTIONS } from '@/lib/constants';
import { formatStoredCost } from '@/lib/price';
import { formatDateVi, formatTimeVi } from '@/lib/slots';
import type { MatchResponse } from '@/schemas/gamerooms';

interface JoinRoomModalProps {
  room: MatchResponse;
  isLoading?: boolean;
  onClose: () => void;
  /** Receives the optional message for the host. */
  onConfirm: (note: string) => void;
}

/** Approved players other than the host, plus the host, as the web "Xác nhận tham gia phòng" popup counts them. */
export function approvedPlayerCount(room: MatchResponse): number {
  const approved = room.participants.filter(
    (participant) =>
      participant.status === 'APPROVED' && participant.role !== 'HOST' && participant.user_id !== room.host_id,
  ).length;
  return approved + 1;
}

/** Room summary and an optional note to the host, shown before a join request is sent (web: JoinRoomModal). */
export function JoinRoomModal({ room, isLoading = false, onClose, onConfirm }: JoinRoomModalProps) {
  const [note, setNote] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);

  const levelLabel =
    SKILL_REQUIREMENT_OPTIONS.find((option) => option.value === room.required_level)?.label ?? room.required_level;
  const hostName = room.host.profile?.full_name || room.host.email;
  const location = room.location || room.court?.venue?.name || room.court?.venue?.address;
  const venue = room.court?.venue;
  const venueCoords: [number, number] | null =
    venue?.latitude != null && venue?.longitude != null ? [venue.latitude, venue.longitude] : null;

  return (
    <PopupModal
      visible
      onClose={onClose}
      title="Xác nhận tham gia phòng"
      subtitle="Gia nhập nhóm và chuẩn bị thi đấu"
      icon={Sparkles}
      dismissOnBackdrop={!isLoading}
      footer={
        <View className="flex-row justify-end gap-2.5">
          <Button variant="outline" label="Hủy" onPress={onClose} disabled={isLoading} />
          <Button loading={isLoading} onPress={() => onConfirm(note.trim())}>
            <ShieldCheck size={16} color="#fff" />
            <Text className="text-base font-bold text-white">Xác nhận tham gia</Text>
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
            <View className="flex-row items-start gap-2">
              <MapPin size={15} color="#F43F5E" />
              <Text className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{location}</Text>
              <Pressable
                onPress={() => setIsMapOpen(true)}
                accessibilityLabel="Xem vị trí sân trên bản đồ"
                className="flex-row items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1"
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
          returnKeyType="done"
        />
      </View>
      {isMapOpen && location ? (
        <ViewLocationModal title={room.title} location={location} coords={venueCoords} onClose={() => setIsMapOpen(false)} />
      ) : null}
    </PopupModal>
  );
}
