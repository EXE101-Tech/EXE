import { Calendar, Car, Coffee, Droplets, MapPin, Package, ShieldCheck, Star, Trash2, Wifi } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SPORTS } from '@/lib/constants';
import type { VenueResponse } from '@/schemas/courts';

export const FACILITY_ICONS: Record<string, { label: string; icon: typeof Wifi }> = {
  wifi: { label: 'WiFi', icon: Wifi },
  parking: { label: 'Bãi xe', icon: Car },
  shower: { label: 'Tắm rửa', icon: Droplets },
  canteen: { label: 'Căng-tin', icon: Coffee },
  rental: { label: 'Thuê đồ', icon: Package },
};

interface VenueCardProps {
  venue: VenueResponse;
  isOwnedByUser: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onSchedule?: () => void;
  onDelete?: () => void;
}

export function VenueCard({ venue, isOwnedByUser, onPress, onEdit, onSchedule, onDelete }: VenueCardProps) {
  const sportMeta = SPORTS.find((s) => s.key === venue.sport_key);
  const facilities = Object.entries(venue.facilities || {}).filter(([, enabled]) => enabled);

  return (
    <Pressable onPress={onPress}>
      <Card className="overflow-hidden">
        <View className="h-40 w-full bg-slate-100 dark:bg-slate-800">
          {venue.image_url ? (
            <Image source={{ uri: resolveMediaUrl(venue.image_url) }} className="h-full w-full" resizeMode="cover" />
          ) : null}

          <View className="absolute left-3 top-3 max-w-[80%] flex-row items-center gap-1 self-start rounded-full bg-black/50 px-3 py-1">
            <Text className="text-xs font-bold text-white" numberOfLines={1}>
              {sportMeta?.emoji ?? '🏅'} {sportMeta?.name ?? 'Môn thể thao'}
            </Text>
          </View>

          {venue.rating != null ? (
            <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1">
              <Star size={12} color="#fff" fill="#fff" />
              <Text className="text-xs font-black text-white">{venue.rating}</Text>
            </View>
          ) : null}

          <View className="absolute bottom-3 left-3 flex-row items-center gap-1 rounded-xl bg-emerald-600/90 px-2.5 py-1">
            <ShieldCheck size={13} color="#fff" />
            <Text className="text-xs font-bold text-white">{venue.court_count} sân hoạt động</Text>
          </View>
        </View>

        <View className="gap-3 p-4">
          <View>
            <Text className="text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>
              {venue.name}
            </Text>
            <View className="mt-1 flex-row items-start gap-1.5">
              <MapPin size={14} color="#F43F5E" />
              <Text className="flex-1 text-xs text-slate-600 dark:text-slate-300" numberOfLines={2}>
                {venue.address}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between border-t border-border pt-2.5 dark:border-border-dark">
            <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">Giá / 30 phút:</Text>
            <Text className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {venue.price_label || 'Liên hệ sân'}
            </Text>
          </View>

          {facilities.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {facilities.map(([key]) => {
                const facility = FACILITY_ICONS[key];
                if (!facility) return null;
                const Icon = facility.icon;
                return (
                  <View
                    key={key}
                    className="flex-row items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1"
                  >
                    <Icon size={11} color="#059669" />
                    <Text className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {facility.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View className="flex-row items-center justify-end gap-2 border-t border-border pt-3 dark:border-border-dark">
            {isOwnedByUser ? (
              <>
                <Button variant="outline" size="icon" onPress={onSchedule}>
                  <Calendar size={16} color="#059669" />
                </Button>
                <Button variant="default" size="sm" label="Chỉnh sửa" onPress={onEdit} className="flex-1" />
                <Button variant="outline" size="icon" onPress={onDelete}>
                  <Trash2 size={16} color="#DC2626" />
                </Button>
              </>
            ) : (
              <Button variant="default" size="sm" label="Đặt sân ngay" onPress={onPress} className="flex-1" />
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
