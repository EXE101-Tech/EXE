import { Award, Banknote, CalendarClock, MapPin, MessageCircle, Pencil, Settings2, Sparkles, Users } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SPORTS } from '@/lib/constants';
import { parseStoredCostToVnd } from '@/lib/price';
import type { LfgPostResponse } from '@/schemas/lfg';

interface LfgPostCardProps {
  post: LfgPostResponse;
  isOwner: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onManage: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onChat: () => void;
  isJoining?: boolean;
  isLeaving?: boolean;
  isCancelling?: boolean;
}

const sportFor = (sportId: string) => SPORTS.find((s) => s.key === sportId);

export function LfgPostCard({
  post,
  isOwner,
  onJoin,
  onLeave,
  onManage,
  onEdit,
  onCancel,
  onChat,
  isJoining,
  isLeaving,
  isCancelling,
}: LfgPostCardProps) {
  const full = post.current_members >= post.total_members;
  const needed = post.total_members - post.current_members;
  const sport = sportFor(post.sport_id);
  const imageUri = resolveMediaUrl(post.image_url);
  const priceVnd = parseStoredCostToVnd(post.price ?? post.price_info);
  const priceLabel = priceVnd !== null ? `${priceVnd.toLocaleString('vi-VN')}đ` : post.price || post.price_info || 'Thỏa thuận';

  return (
    <Card>
      <View className="gap-3 p-3.5">
        {/* Thumbnail (left) + author/title (right) — mirrors the web post card's layout */}
        <View className="flex-row gap-3">
          <View className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-brand/10 dark:bg-brand-dark/15">
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Text className="text-4xl">{sport?.emoji ?? '🏅'}</Text>
              </View>
            )}
            <View className="absolute left-1.5 top-1.5 h-5 w-5 items-center justify-center rounded-full bg-black/55">
              <Text className="text-xs">{sport?.emoji ?? '🏅'}</Text>
            </View>
            <View className="absolute bottom-1.5 left-1.5 flex-row items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5">
              <Award size={9} color="#74C365" />
              <Text className="text-[9px] font-bold text-white" numberOfLines={1}>
                {post.skill_level}
              </Text>
            </View>
          </View>

          <View className="flex-1 gap-1">
            <View className="flex-row items-start justify-between gap-1.5">
              <View className="flex-1 flex-row items-center gap-1.5">
                <Avatar uri={post.author_avatar_url} fallback={post.author_name} size={22} />
                <Text className="flex-1 text-xs font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                  {post.author_name}
                </Text>
              </View>
              <Badge variant={full ? 'neutral' : 'success'} label={full ? 'Đã đủ' : `Còn ${needed} slot`} />
            </View>
            <Text className="text-sm font-black leading-tight text-slate-900 dark:text-white" numberOfLines={2}>
              {post.title}
            </Text>
            {post.description ? (
              <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={2}>
                {post.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Detail rows — full card width so text has room to breathe */}
        <View className="gap-1.5">
          <View className="flex-row gap-1.5">
            <View className="flex-1 flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/5">
              <MapPin size={13} color="#F43F5E" />
              <Text className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200" numberOfLines={2}>
                {post.location}
              </Text>
            </View>
            <View className="flex-[1.5] flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/5">
              <CalendarClock size={13} color="#3B82F6" />
              <Text className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200" numberOfLines={2}>
                {post.time_slot} ({post.date_label})
              </Text>
            </View>
          </View>
          <View className="flex-row gap-1.5">
            <View className="flex-1 flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/5">
              <Users size={13} color="#059669" />
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Thành viên:{' '}
                <Text className="font-black text-brand dark:text-brand-dark">
                  {post.current_members}/{post.total_members}
                </Text>
              </Text>
            </View>
            <View className="flex-1 flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/5">
              <Banknote size={13} color="#F59E0B" />
              <Text className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200" numberOfLines={1}>
                Chi phí/người: <Text className="font-black text-slate-900 dark:text-white">{priceLabel}</Text>
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-end gap-2 border-t border-border pt-3 dark:border-border-dark">
          {isOwner ? (
            <>
              <Button variant="outline" size="icon" onPress={onEdit}>
                <Pencil size={14} color="#0EA5E9" />
              </Button>
              <Button variant="outline" size="sm" onPress={onManage}>
                <Settings2 size={14} color="#0EA5E9" />
                <Text className="text-xs font-bold text-brand dark:text-brand-dark">
                  Quản lý{post.pending_participants_count > 0 ? ` (${post.pending_participants_count})` : ''}
                </Text>
              </Button>
              <Button variant="destructive" size="sm" loading={isCancelling} onPress={onCancel} label="Xóa" />
            </>
          ) : (
            <>
              <Button variant="outline" size="icon" onPress={onChat}>
                <MessageCircle size={15} color="#0EA5E9" />
              </Button>
              {post.has_joined ? (
                <Button variant="outline" size="sm" loading={isLeaving} onPress={onLeave} label="Rời kèo" />
              ) : (
                <Button size="sm" disabled={full} loading={isJoining} onPress={onJoin}>
                  <Sparkles size={14} color="#fff" />
                  <Text className="text-xs font-bold text-white">Tham gia</Text>
                </Button>
              )}
            </>
          )}
        </View>
      </View>
    </Card>
  );
}
