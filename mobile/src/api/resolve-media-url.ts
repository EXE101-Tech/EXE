import { env } from '@/lib/env';

/** Storage uploads return a relative path (e.g. "/api/storage/media/…") — resolve it against the API host. */
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const apiOrigin = new URL(env.apiUrl).origin;
  return new URL(path, apiOrigin).toString();
}
