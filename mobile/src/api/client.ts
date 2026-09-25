import axios, { type AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '@/lib/constants';

export const TOKEN_STORAGE_KEY = 'token';

/** Set by stores/auth-store.ts so the 401 interceptor can clear the session without a circular import. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ detail?: string; message?: string }>) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    const message = error.response?.data?.detail || error.response?.data?.message || 'Đã có lỗi xảy ra';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
