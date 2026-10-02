import axios, { type AxiosError } from 'axios';

import { env } from '@/lib/env';
import { secureStorage } from '@/lib/secure-storage';

export const TOKEN_STORAGE_KEY = 'token';

/** Set by stores/auth-store.ts so the 401 interceptor can clear the session without a circular import. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

type ErrorDetail = string | { msg?: string }[] | undefined;

/** FastAPI returns `detail` as a string for HTTPException but as a list of `{msg}` for 422 validation errors. */
function formatErrorDetail(detail: ErrorDetail): string | undefined {
  if (!detail) return undefined;
  if (typeof detail === 'string') return detail;
  const first = detail.find((item) => item?.msg)?.msg;
  return first?.replace(/^Value error,\s*/, '');
}

const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await secureStorage.getItemAsync(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ detail?: ErrorDetail; message?: string }>) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    const message =
      formatErrorDetail(error.response?.data?.detail) || error.response?.data?.message || 'Đã có lỗi xảy ra';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
