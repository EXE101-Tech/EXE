import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { TOKEN_STORAGE_KEY, setUnauthorizedHandler } from '@/api/client';
import { authApi } from '@/api/auth';
import { ownerApi } from '@/api/owner';
import { resolveMediaUrl } from '@/api/resolve-media-url';
import type { UserCreate, UserLogin, UserProfileWithSportsUpdate, UserResponse } from '@/schemas/auth';

export interface NormalizedUser extends UserResponse {
  name: string;
  avatar: string;
  ownerStatus: string;
  isCourtOwner: boolean;
}

function normalizeUser(user: UserResponse): NormalizedUser {
  const ownerStatus = user.owner_status || 'none';
  return {
    ...user,
    profile: user.profile
      ? {
          ...user.profile,
          avatar_url: resolveMediaUrl(user.profile.avatar_url),
          cover_url: resolveMediaUrl(user.profile.cover_url),
        }
      : user.profile,
    name: user.profile?.full_name || user.email?.split('@')[0] || 'Người dùng',
    avatar: user.profile?.avatar_url ? resolveMediaUrl(user.profile.avatar_url) : '',
    ownerStatus,
    isCourtOwner: ownerStatus === 'registered',
  };
}

interface AuthState {
  user: NormalizedUser | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  login: (credentials: UserLogin) => Promise<NormalizedUser>;
  register: (data: UserCreate) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<NormalizedUser>;
  updateProfile: (data: UserProfileWithSportsUpdate) => Promise<NormalizedUser>;
  applyOwnerRegistration: () => Promise<void>;
  cancelOwnerRegistration: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,
  isAuthenticated: false,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    if (!token) {
      set({ hydrated: true });
      return;
    }
    try {
      const me = await authApi.getMe();
      set({ user: normalizeUser(me), isAuthenticated: true, hydrated: true });
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      set({ user: null, isAuthenticated: false, hydrated: true });
    }
  },

  login: async (credentials) => {
    const response = await authApi.login(credentials);
    if (!response?.access_token) throw new Error('Máy chủ không trả về token đăng nhập');
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, response.access_token);
    try {
      const me = await authApi.getMe();
      const normalized = normalizeUser(me);
      set({ user: normalized, isAuthenticated: true });
      return normalized;
    } catch (error) {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      set({ user: null, isAuthenticated: false });
      throw error;
    }
  },

  register: async (data) => {
    await authApi.register(data);
  },

  logout: () => {
    authApi.logout().catch(() => {});
    SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
    set({ user: null, isAuthenticated: false });
  },

  refreshProfile: async () => {
    const normalized = normalizeUser(await authApi.getMe());
    set({ user: normalized });
    return normalized;
  },

  updateProfile: async (data) => {
    const normalized = normalizeUser(await authApi.updateMe(data));
    set({ user: normalized });
    return normalized;
  },

  applyOwnerRegistration: async () => {
    const status = await ownerApi.register();
    const current = get().user;
    if (current) {
      set({
        user: { ...current, ownerStatus: status.owner_status, owner_status: status.owner_status, isCourtOwner: status.owner_status === 'registered' },
      });
    }
  },

  cancelOwnerRegistration: async () => {
    const status = await ownerApi.cancelRegistration();
    const current = get().user;
    if (current) {
      set({
        user: { ...current, ownerStatus: status.owner_status, owner_status: status.owner_status, isCourtOwner: status.owner_status === 'registered' },
      });
    }
  },
}));

setUnauthorizedHandler(() => {
  SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
  useAuthStore.setState({ user: null, isAuthenticated: false });
});
