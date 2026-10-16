/**
 * Single place that reads runtime configuration. Every value comes from `.env` (EXPO_PUBLIC_*) — nothing
 * is hardcoded in source. Copy `.env.example` to `.env` and fill it in.
 *
 * Expo only inlines literal `process.env.EXPO_PUBLIC_X` accesses at build time, so each variable must be
 * referenced explicitly (no dynamic `process.env[name]`).
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
const mapStyleUrl = process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim() ?? '';

if (!apiUrl) {
  // The app cannot talk to the backend without this, so fail loudly instead of with a cryptic network error.
  throw new Error('Thiếu biến môi trường EXPO_PUBLIC_API_URL. Hãy copy .env.example thành .env rồi điền giá trị.');
}

export const env = {
  /** Backend base URL including `/api`, e.g. http://<LAN-IP>:8000/api */
  apiUrl,
  /** OAuth *Web* client ID — the audience of the ID token the native Google Sign-In returns. Empty = Google login disabled. */
  googleWebClientId,
  /** MapLibre style JSON URL. Empty = map screen shows a configuration notice. */
  mapStyleUrl,
} as const;
