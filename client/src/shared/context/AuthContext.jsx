import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, ownerService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function normalizeUser(user) {
  if (!user) return null;
  const ownerStatus = user.owner_status || 'none';
  return {
    ...user,
    name: user.profile?.full_name || user.email?.split('@')[0] || 'Người dùng',
    avatar: user.profile?.avatar_url || '',
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

  const login = async (credentials) => {
    const response = await authService.login(credentials);
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

  const register = (data) => authService.register(data);

  const logout = () => {
    if (token) authService.logout(token).catch(() => {});
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    const profile = normalizeUser(await authService.getProfile());
    setUser(profile);
    return profile;
  };

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

  const value = {
    user,
    token,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile,
    applyOwnerRegistration,
    cancelOwnerRegistration,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
