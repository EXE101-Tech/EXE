import { CalendarDays, Clock3, MapPin, XCircle } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateVi, formatTimeVi, isFutureTime } from '@/lib/slots';
import type { BookingResponse } from '@/schemas/bookings';

interface BookingCardProps {
  booking: BookingResponse;
  onCancel: () => void;
  isCancelling?: boolean;
}

export function BookingCard({ booking, onCancel, isCancelling }: BookingCardProps) {
  const venue = booking.court.venue;
  const cancelled = booking.status?.toLowerCase() === 'cancelled';
  const isUpcoming = !cancelled && isFutureTime(booking.start_time);

  return (
    <Card>
      <View className="gap-2.5 p-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="flex-1 text-base font-black text-slate-900 dark:text-white" numberOfLines={1}>
            {venue.name}
          </Text>
          <Badge variant={cancelled ? 'neutral' : 'success'} label={cancelled ? 'Đã hủy' : 'Đã xác nhận'} />
        </View>

        {venue.address ? (
          <View className="flex-row items-start gap-1.5">
            <MapPin size={14} color="#94A3B8" />
            <Text className="flex-1 text-xs text-slate-500 dark:text-slate-400">{venue.address}</Text>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
          <View className="flex-row items-center gap-1.5">
            <CalendarDays size={14} color="#059669" />
            <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {formatDateVi(booking.start_time)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Clock3 size={14} color="#059669" />
            <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {formatTimeVi(booking.start_time)}–{formatTimeVi(booking.end_time)}
            </Text>
          </View>
        </View>

        <Text className="text-[11px] text-slate-400">
          Mã đặt sân: {booking.id} · {booking.court.name}
        </Text>

        <View className="flex-row items-center justify-between border-t border-border pt-2.5 dark:border-border-dark">
          <Text className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {Number(booking.total_price).toLocaleString('vi-VN')}đ
          </Text>
          {isUpcoming ? (
            <Button variant="outline" size="sm" disabled={isCancelling} onPress={onCancel}>
              <XCircle size={14} color="#E11D48" />
              <Text className="text-xs font-bold text-rose-600">
                {isCancelling ? 'Đang hủy…' : 'Hủy lịch'}
              </Text>
            </Button>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
