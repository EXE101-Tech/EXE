import { LogOut, MapPin, MessageCircle, Settings2, Star, UserPlus, Users } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SPORTS } from '@/lib/constants';
import type { TeamResponse } from '@/schemas/teams';

interface TeamCardProps {
  team: TeamResponse;
  onJoin: () => void;
  onLeave: () => void;
  onManage: () => void;
  onEdit: () => void;
  onReview: () => void;
  onChat: () => void;
  isJoining?: boolean;
  isLeaving?: boolean;
}

const sportFor = (sportId: string) => SPORTS.find((s) => s.key === sportId);

export function TeamCard({ team, onJoin, onLeave, onManage, onEdit, onReview, onChat, isJoining, isLeaving }: TeamCardProps) {
  const full = team.member_count >= team.total_slots;
  const available = team.total_slots - team.member_count;
  const pending = team.membership_status === 'PENDING';
  const sport = sportFor(team.sport_id);
  const imageUri = resolveMediaUrl(team.image_url);
  const createdAt = new Date(team.created_at).toLocaleDateString('vi-VN');

  return (
    <Card>
      <View className="gap-3 p-3.5">
        {/* Thumbnail (left) + owner header (right) */}
        <View className="flex-row gap-3">
          <View className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-brand/10 dark:bg-brand-dark/15">
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Text className="text-4xl">{sport?.emoji ?? '🏅'}</Text>
              </View>
            )}
            <View className="absolute bottom-1.5 left-1.5 flex-row items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5">
              <Star size={9} color="#F59E0B" fill="#F59E0B" />
              <Text className="text-[9px] font-bold text-white">{team.rating.toFixed(1)}</Text>
            </View>
          </View>

          <View className="flex-1 gap-1">
            <View className="flex-row items-start justify-between gap-1.5">
              <View className="flex-1 flex-row items-center gap-1.5">
                <Avatar fallback={team.owner_name} size={22} />
                <Text className="flex-1 text-xs font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                  {team.owner_name}
                </Text>
              </View>
              <Badge variant={full ? 'neutral' : 'success'} label={full ? 'Đã đầy' : `Còn ${available} slot`} />
            </View>
            <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Trưởng CLB • {createdAt}
            </Text>
            <Text className="text-sm font-black leading-tight text-slate-900 dark:text-white" numberOfLines={2}>
              {team.name}
            </Text>
          </View>
        </View>

        {team.description ? (
          <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={2}>
            {team.description}
          </Text>
        ) : null}

        {/* Location + member count on one row */}
        <View className="flex-row gap-1.5">
          <View className="flex-[1.4] flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/5">
            <MapPin size={13} color="#F43F5E" />
            <Text className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200" numberOfLines={2}>
              {team.location}
            </Text>
          </View>
          <View className="flex-1 flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/5">
            <Users size={13} color="#3B82F6" />
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Text className="font-black text-brand dark:text-brand-dark">
                {team.member_count}/{team.total_slots}
              </Text>
            </Text>
          </View>
        </View>

        {team.tags.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {team.tags.map((tag) => (
              <Badge key={tag} variant="neutral" label={tag} />
            ))}
          </View>
        ) : null}

        {/* Footer — actions depend on the viewer's relationship to this team */}
        <View className="flex-row items-center gap-2 border-t border-border pt-3 dark:border-border-dark">
          {team.is_captain ? (
            <>
              <Button size="sm" className="flex-1" onPress={onManage}>
                <Users size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">Quản lý thành viên</Text>
              </Button>
              <Button variant="outline" size="icon" onPress={onEdit}>
                <Settings2 size={15} color="#0EA5E9" />
              </Button>
            </>
          ) : team.is_member ? (
            <>
              <Button variant="outline" size="icon" onPress={onChat}>
                <MessageCircle size={15} color="#0EA5E9" />
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onPress={onManage}>
                <Users size={14} color="#0EA5E9" />
                <Text className="text-xs font-bold text-brand dark:text-brand-dark">Xem thành viên</Text>
              </Button>
              <Button variant="outline" size="icon" loading={isLeaving} onPress={onLeave}>
                <LogOut size={15} color="#E11D48" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onPress={onReview}>
                <Star size={14} color="#D97706" />
                <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">Đánh giá</Text>
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={full || pending}
                loading={isJoining}
                onPress={onJoin}
              >
                <UserPlus size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">{pending ? 'Đang chờ duyệt' : 'Xin gia nhập CLB'}</Text>
              </Button>
              <Button variant="outline" size="icon" onPress={onChat}>
                <MessageCircle size={15} color="#0EA5E9" />
              </Button>
            </>
          )}
        </View>
      </View>
    </Card>
  );
}
