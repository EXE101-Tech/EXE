export const roomDate = (value) => value ? new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`) : null;

export function responseTimeLeft(deadline, currentTime) {
  const seconds = Math.max(0, Math.ceil((roomDate(deadline).getTime() - currentTime) / 1000));
  if (!seconds) return 'Đã hết hạn';
  return `Còn ${Math.floor(seconds / 60)} phút ${String(seconds % 60).padStart(2, '0')} giây`;
}
