import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService, ownerService, resolveMediaUrl } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function normalizeUser(user) {
  if (!user) return null;
  const ownerStatus = user.owner_status || 'none';
  return {
    ...user,
    profile: user.profile ? {
      ...user.profile,
      avatar_url: resolveMediaUrl(user.profile.avatar_url),
      cover_url: resolveMediaUrl(user.profile.cover_url),
    } : user.profile,
    name: user.profile?.full_name || user.email?.split('@')[0] || 'Người dùng',
    avatar: user.profile?.avatar_url || '',
    isAdmin: Boolean(user.is_admin),
    isPremium: Boolean(user.is_premium || (user.premium_until && new Date(user.premium_until).getTime() > Date.now())),
    ownerStatus,
    isCourtOwner: ownerStatus === 'registered',
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token');
    return storedToken?.startsWith('mock-jwt-token-') ? null : storedToken;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken?.startsWith('mock-jwt-token-')) localStorage.removeItem('token');
    if (!token) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    authService.getProfile()
      .then((userData) => {
        if (active) setUser(normalizeUser(userData));
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [token]);

  const completeLogin = async (response) => {
    if (!response?.access_token) throw new Error('Máy chủ không trả về token đăng nhập');
    localStorage.setItem('token', response.access_token);
    setToken(response.access_token);
    try {
      const profile = await authService.getProfile();
      setUser(normalizeUser(profile));
      return { ...response, user: normalizeUser(profile) };
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  const login = async (credentials) => completeLogin(await authService.login(credentials));
  const loginWithGoogle = async (code, acceptedTerms = false) => completeLogin(await authService.loginWithGoogle(code, acceptedTerms));

  const register = async (data) => completeLogin(await authService.register(data));

  const logout = () => {
    if (token) authService.logout(token).catch(() => {});
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = useCallback(async () => {
    const profile = normalizeUser(await authService.getProfile());
    setUser(profile);
    return profile;
  }, []);

  const applyOwnerRegistration = async () => {
    const status = await ownerService.register();
    setUser((current) => current ? { ...current, ownerStatus: status.owner_status, owner_status: status.owner_status, isCourtOwner: status.owner_status === 'registered' } : current);
    return status;
  };

  const cancelOwnerRegistration = async () => {
    const status = await ownerService.cancelRegistration();
    setUser((current) => current ? { ...current, ownerStatus: status.owner_status, owner_status: status.owner_status, isCourtOwner: status.owner_status === 'registered' } : current);
    return status;
  };

  const updateProfile = async (data) => {
    const updatedUser = normalizeUser(await authService.updateProfile(data));
    setUser(updatedUser);
    return updatedUser;
  };

  const acceptTerms = async () => {
    await authService.acceptTerms();
    setUser((current) => current ? { ...current, community_guidelines_accepted: true } : current);
  };

  const deleteAccount = async () => {
    await authService.deleteAccount();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    refreshProfile,
    applyOwnerRegistration,
    cancelOwnerRegistration,
    acceptTerms,
    deleteAccount,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
