// Ported from client/src/features/courts/components/CourtSchedule.jsx and CourtDetailPage.jsx —
// keep the same 06:00-24:00 / 30-minute grid and fixed +07:00 offset (Vietnam has no DST).

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const TIME_SLOTS: string[] = Array.from({ length: 36 }, (_, index) => {
  const minutes = 360 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
});

export function getVietnamDate(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + offsetDays));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function nowVietnamMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

export interface DateStripItem {
  value: string;
  label: string;
  day: number;
  month: number;
}

export function buildDateStrip(days = 7): DateStripItem[] {
  return Array.from({ length: days }, (_, index) => {
    const value = getVietnamDate(index);
    const date = new Date(`${value}T12:00:00+07:00`);
    return {
      value,
      label: index === 0 ? 'Hôm nay' : DAY_NAMES[date.getDay()],
      day: date.getDate(),
      month: date.getMonth() + 1,
    };
  });
}

/** A 30-minute slot's start Date, given a `YYYY-MM-DD` day and `HH:mm` slot time. */
export function slotStart(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+07:00`);
}

export function toUtcEpoch(value: string): number {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  return new Date(normalized).getTime();
}

/** Whether an ISO timestamp is still in the future — wrapped here so components never call `Date.now()` directly during render. */
export function isFutureTime(value: string): boolean {
  return toUtcEpoch(value) > Date.now();
}

export interface OccupiedRangeItem {
  court_id: number;
  start_time: string;
  end_time: string;
}

/** Set of `"courtId|HH:mm"` keys covered by any of the given [start_time, end_time) ranges on `date`. */
export function buildOccupiedSlotSet(items: OccupiedRangeItem[], date: string): Set<string> {
  const occupied = new Set<string>();
  items.forEach((item) => {
    const start = toUtcEpoch(item.start_time);
    const end = toUtcEpoch(item.end_time);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    TIME_SLOTS.forEach((time) => {
      const cellStart = slotStart(date, time).getTime();
      const cellEnd = cellStart + 30 * 60 * 1000;
      if (start < cellEnd && end > cellStart) occupied.add(`${item.court_id}|${time}`);
    });
  });
  return occupied;
}

export interface SlotRange {
  courtId: number;
  startTime: string;
  endTime: string;
}

/** Merges contiguous 30-min slot picks per court into start/end ranges (a reservation block is one range). */
export function groupConsecutiveSlots(date: string, selectedSlots: Set<string>): SlotRange[] {
  const byCourt = new Map<number, string[]>();
  Array.from(selectedSlots)
    .map((key) => {
      const [courtIdRaw, time] = key.split('|');
      return { courtId: Number(courtIdRaw), time };
    })
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach(({ courtId, time }) => {
      const list = byCourt.get(courtId) ?? [];
      list.push(time);
      byCourt.set(courtId, list);
    });

  const ranges: SlotRange[] = [];
  byCourt.forEach((times, courtId) => {
    let rangeStart = times[0];
    let previous = times[0];
    for (let i = 1; i <= times.length; i += 1) {
      const time = times[i];
      const isConsecutive = time && slotStart(date, time).getTime() === slotStart(date, previous).getTime() + 30 * 60 * 1000;
      if (!isConsecutive) {
        const endTime = slotStart(date, previous).getTime() + 30 * 60 * 1000;
        ranges.push({
          courtId,
          startTime: slotStart(date, rangeStart).toISOString(),
          endTime: new Date(endTime).toISOString(),
        });
        rangeStart = time;
      }
      previous = time ?? previous;
    }
  });
  return ranges;
}

const withZ = (value: string) => (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);

export function formatDateVi(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(withZ(value)));
}

export function formatTimeVi(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(withZ(value)));
}
