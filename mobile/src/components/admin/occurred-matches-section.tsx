import { Text } from '@/components/ui/text';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOccurredAttendanceQuery, useOccurredRoomsQuery } from '@/hooks/queries/use-admin';
import { formatStoredCost } from '@/lib/price';
import { toUtcEpoch } from '@/lib/slots';
import type { AdminAttendanceOutcome, AdminMatch } from '@/schemas/admin';
import { AdminRow, SectionHeading, Segmented, ShowMoreButton, formatDateTimeVi, useShowMore } from './admin-ui';

type Period = 'all' | '7' | '30' | 'month';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: '7', label: '7 ngày' },
  { value: '30', label: '30 ngày' },
  { value: 'month', label: 'Tháng này' },
];

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Rooms that started inside the period, counted in Vietnam calendar days (same rule as the web filter). */
function filterByPeriod(rooms: AdminMatch[], period: Period): AdminMatch[] {
  if (period === 'all') return rooms;
  const now = Date.now();
  const today = new Date(now + VIETNAM_OFFSET_MS);
  const firstDay = period === 'month' ? 1 : today.getUTCDate() - Number(period) + 1;
  const from = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), firstDay) - VIETNAM_OFFSET_MS;
  return rooms.filter((room) => {
    const start = toUtcEpoch(room.start_time);
    return start >= from && start <= now;
  });
}

const OUTCOME_BADGES: Record<AdminAttendanceOutcome, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  ATTENDED: { label: 'Có mặt đã xác nhận', variant: 'success' },
  NO_SHOW: { label: 'Vắng', variant: 'danger' },
  UNVERIFIED: { label: 'Chưa có kết quả', variant: 'neutral' },
};

/** Rooms verified as having happened (web: "Trận đã diễn ra"), with the verified attendance of every player. */
export function OccurredMatchesSection() {
  const query = useOccurredRoomsQuery();
  const [period, setPeriod] = useState<Period>('all');
  const matching = filterByPeriod(query.data ?? [], period);
  const { visible, remaining, showMore, reset } = useShowMore(matching);

  return (
    <View className="gap-3">
      <SectionHeading
        icon={CheckCircle2}
        iconColor="#10B981"
        title={query.data ? `Trận đã diễn ra (${matching.length})` : 'Trận đã diễn ra'}
        hint="Đã xác minh điểm danh"
      />
      <Segmented
        value={period}
        onChange={(value) => {
          setPeriod(value);
          reset();
        }}
        options={PERIOD_OPTIONS}
      />
      {query.isLoading ? (
        <LoadingState label="Đang tải danh sách trận…" />
      ) : query.isError ? (
        <EmptyState title="Không tải được danh sách trận" description="Kéo xuống để tải lại." />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={
            period === 'all'
              ? 'Chưa có trận nào được xác minh đã diễn ra.'
              : 'Không có trận đã xác minh trong khoảng thời gian này.'
          }
        />
      ) : (
        visible.map((room) => <OccurredMatchCard key={room.id} room={room} />)
      )}
      <ShowMoreButton remaining={remaining} onPress={showMore} />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="gap-0.5">
      <Text className="text-[11px] text-slate-500 dark:text-slate-400">{label}</Text>
      <Text className="text-sm text-slate-900 dark:text-slate-100">{value}</Text>
    </View>
  );
}

function OccurredMatchCard({ room }: { room: AdminMatch }) {
  const [open, setOpen] = useState(false);
  // Attendance is only fetched once the card is opened.
  const attendance = useOccurredAttendanceQuery(room.id, open);
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <AdminRow>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-start justify-between gap-2"
      >
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text className="font-bold text-slate-900 dark:text-white">{room.title}</Text>
            {room.removed ? <Badge variant="warning" label="Phòng đã gỡ" /> : null}
          </View>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            #{room.id} · {room.sport.name} · {formatDateTimeVi(room.start_time)}
          </Text>
        </View>
        <Chevron size={18} color="#94A3B8" />
      </Pressable>

      {open ? (
        <View className="gap-3 border-t border-border pt-3 dark:border-border-dark">
          <View className="gap-2.5">
            <DetailRow label="Bắt đầu" value={formatDateTimeVi(room.start_time)} />
            <DetailRow label="Kết thúc" value={formatDateTimeVi(room.end_time)} />
            <DetailRow label="Địa điểm" value={room.location || room.court?.venue?.address} />
            <DetailRow label="Sân" value={room.court?.name} />
            <DetailRow label="Chủ phòng" value={room.host.profile?.full_name || room.host.email} />
            <DetailRow label="Chi phí mỗi người" value={room.price_info ? formatStoredCost(room.price_info) : null} />
          </View>

          <View className="gap-2 border-t border-border pt-3 dark:border-border-dark">
            <Text className="text-sm font-black text-slate-900 dark:text-white">Kết quả điểm danh</Text>
            {attendance.isLoading ? (
              <LoadingState label="Đang tải kết quả điểm danh…" />
            ) : attendance.isError ? (
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-xs font-semibold text-rose-600 dark:text-rose-300">
                  Không thể tải kết quả điểm danh.
                </Text>
                <Button variant="outline" size="sm" label="Thử lại" onPress={() => attendance.refetch()} />
              </View>
            ) : (
              (attendance.data ?? []).map((result) => {
                const badge = OUTCOME_BADGES[result.outcome];
                return (
                  <View
                    key={result.user_id}
                    className="flex-row items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5"
                  >
                    <Text className="min-w-0 flex-1 text-sm text-slate-900 dark:text-slate-100">
                      {result.name}
                      {result.is_host ? <Text className="text-slate-500 dark:text-slate-400"> · Chủ phòng</Text> : null}
                    </Text>
                    <Badge variant={badge.variant} label={badge.label} />
                  </View>
                );
              })
            )}
          </View>

          {room.description ? (
            <Text className="text-sm text-slate-600 dark:text-slate-300">{room.description}</Text>
          ) : null}
        </View>
      ) : null}
    </AdminRow>
  );
}
