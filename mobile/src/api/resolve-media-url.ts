import { API_BASE_URL } from '@/lib/constants';

/** Storage uploads return a relative path (e.g. "/api/storage/media/…") — resolve it against the API host. */
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const apiOrigin = new URL(API_BASE_URL).origin;
  return new URL(path, apiOrigin).toString();
}
