import { create } from 'zustand';

import { TOKEN_STORAGE_KEY, setUnauthorizedHandler } from '@/api/client';
import { authApi } from '@/api/auth';
import { resolveMediaUrl } from '@/api/resolve-media-url';
import { secureStorage } from '@/lib/secure-storage';
import type { UserCreate, UserLogin, UserProfileWithSportsUpdate, UserResponse } from '@/schemas/auth';

const ONBOARDING_KEY = 'sportgo-onboarding-pending';

export interface NormalizedUser extends UserResponse {
  name: string;
  avatar: string;
  ownerStatus: string;
  isCourtOwner: boolean;
  isAdmin: boolean;
  isPremium: boolean;
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
    isAdmin: Boolean(user.is_admin),
    isPremium: Boolean(user.is_premium || (user.premium_until && new Date(user.premium_until).getTime() > Date.now())),
  };
}

/** Onboarding is flagged per user id so a half-finished setup resumes only for the account that registered. */
async function readOnboardingPending(userId: number): Promise<boolean> {
  return (await secureStorage.getItemAsync(ONBOARDING_KEY)) === String(userId);
}

interface AuthState {
  user: NormalizedUser | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  onboardingPending: boolean;
  hydrate: () => Promise<void>;
  login: (credentials: UserLogin) => Promise<NormalizedUser>;
  loginWithGoogle: (idToken: string, acceptedTerms?: boolean) => Promise<NormalizedUser>;
  register: (data: UserCreate) => Promise<NormalizedUser>;
  completeOnboarding: () => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<NormalizedUser>;
  updateProfile: (data: UserProfileWithSportsUpdate) => Promise<NormalizedUser>;
  acceptTerms: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  /** Stores the token and loads the profile, rolling the token back if either step fails. */
  const establishSession = async (accessToken: string | undefined, isNewUser: boolean): Promise<NormalizedUser> => {
    if (!accessToken) throw new Error('Máy chủ không trả về token đăng nhập');
    await secureStorage.setItemAsync(TOKEN_STORAGE_KEY, accessToken);
    try {
      const normalized = normalizeUser(await authApi.getMe());
      if (isNewUser) await secureStorage.setItemAsync(ONBOARDING_KEY, String(normalized.id));
      const onboardingPending = isNewUser || (await readOnboardingPending(normalized.id));
      set({ user: normalized, isAuthenticated: true, onboardingPending });
      return normalized;
    } catch (error) {
      await secureStorage.deleteItemAsync(TOKEN_STORAGE_KEY);
      set({ user: null, isAuthenticated: false, onboardingPending: false });
      throw error;
    }
  };

  return {
    user: null,
    hydrated: false,
    isAuthenticated: false,
    onboardingPending: false,

    hydrate: async () => {
      const token = await secureStorage.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        set({ hydrated: true });
        return;
      }
      try {
        const normalized = normalizeUser(await authApi.getMe());
          const onboardingPending = await readOnboardingPending(normalized.id);
        set({ user: normalized, isAuthenticated: true, onboardingPending, hydrated: true });
      } catch {
        await secureStorage.deleteItemAsync(TOKEN_STORAGE_KEY);
        set({ user: null, isAuthenticated: false, onboardingPending: false, hydrated: true });
      }
    },

    login: async (credentials) => {
      const response = await authApi.login(credentials);
      return establishSession(response.access_token, false);
    },

    loginWithGoogle: async (idToken, acceptedTerms = false) => {
      const response = await authApi.googleLogin(idToken, acceptedTerms);
      return establishSession(response.access_token, response.is_new_user);
    },

    register: async (data) => {
      const response = await authApi.register(data);
      return establishSession(response.access_token, response.is_new_user);
    },

    completeOnboarding: async () => {
      await secureStorage.deleteItemAsync(ONBOARDING_KEY);
      set({ onboardingPending: false });
    },

    logout: () => {
      authApi.logout().catch(() => {});
      secureStorage.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
      set({ user: null, isAuthenticated: false, onboardingPending: false });
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

    acceptTerms: async () => {
      await authApi.acceptTerms();
      set((state) => ({ user: state.user ? { ...state.user, community_guidelines_accepted: true } : state.user }));
    },

    deleteAccount: async () => {
      await authApi.deleteAccount();
      await secureStorage.deleteItemAsync(TOKEN_STORAGE_KEY);
      set({ user: null, isAuthenticated: false, onboardingPending: false });
    },


  };
});

setUnauthorizedHandler(() => {
  secureStorage.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
  useAuthStore.setState({ user: null, isAuthenticated: false, onboardingPending: false });
});
