// Ported from the web court schedule — keep the same 06:00-24:00 / 30-minute grid and fixed +07:00 offset (Vietnam has no DST).

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

/** YYYY-MM-DD of an API timestamp in Vietnam time, used to prefill the edit-room form. */
export function toVietnamDateInput(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(toUtcEpoch(value)));
}

/** HH:mm of an API timestamp in Vietnam time, used to prefill the edit-room form. */
export function toVietnamTimeInput(value: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(toUtcEpoch(value)));
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.hour}:${values.minute}`;
}
