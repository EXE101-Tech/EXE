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
      // TẠM THỜI COMMENT GỌI ENDPOINT THEO YÊU CẦU:
      /*
      authService.getProfile()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
      */

      // --- MOCK GET PROFILE ---
      const savedUser = localStorage.getItem('mock_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        setUser({
          id: 1,
          name: 'Người dùng SportGo',
          email: 'user@sportgo.vn',
          role: 'user',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        });
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (data) => {
    try {
      // TẠM THỜI COMMENT GỌI ENDPOINT THEO YÊU CẦU:
      /*
      const response = await authService.login(data);
      if (response && response.access_token) {
        localStorage.setItem('token', response.access_token);
        setToken(response.access_token);
        const userData = await authService.getProfile();
        setUser(userData);
      }
      return response;
      */

      // --- MOCK LOGIN (Tạm thời không gọi endpoint) ---
      const mockToken = 'mock-jwt-token-sportgo-temporary';
      const mockUser = {
        id: 1,
        name: data?.email ? data.email.split('@')[0] : 'Người dùng SportGo',
        email: data?.email || 'user@sportgo.vn',
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      };

      localStorage.setItem('token', mockToken);
      localStorage.setItem('mock_user', JSON.stringify(mockUser));
      setToken(mockToken);
      setUser(mockUser);

      return { access_token: mockToken, user: mockUser };
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
    localStorage.removeItem('mock_user');
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
