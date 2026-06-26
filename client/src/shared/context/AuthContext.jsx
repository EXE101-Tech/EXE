import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Validate token and fetch user profile
      authService.getProfile()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token invalid or expired
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (data) => {
    try {
      const response = await authService.login(data);
      if (response && response.access_token) {
        localStorage.setItem('token', response.access_token);
        setToken(response.access_token);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (data) => {
    try {
      const response = await authService.register(data);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    try {
      const updatedUser = await authService.updateProfile(data);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error("Failed to update profile", error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    updateProfile,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
