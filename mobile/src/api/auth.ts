import apiClient from './client';
import { tokenSchema, userLoginSchema, userCreateSchema, userResponseSchema, userProfileWithSportsUpdateSchema, userStatsResponseSchema, type UserLogin, type UserCreate, type UserProfileWithSportsUpdate } from '@/schemas/auth';

export const authApi = {
  login: async (data: UserLogin) => tokenSchema.parse(await apiClient.post('/auth/login', userLoginSchema.parse(data))),
  register: async (data: UserCreate) => tokenSchema.parse(await apiClient.post('/auth/register', userCreateSchema.parse(data))),
  googleLogin: async (idToken: string, acceptedTerms = false) =>
    tokenSchema.parse(await apiClient.post('/auth/google/mobile', { id_token: idToken, accepted_terms: acceptedTerms })),
  logout: async () => apiClient.post('/auth/logout'),
  getMe: async () => userResponseSchema.parse(await apiClient.get('/auth/me')),
  updateMe: async (data: UserProfileWithSportsUpdate) =>
    userResponseSchema.parse(await apiClient.put('/auth/me', userProfileWithSportsUpdateSchema.parse(data))),
  getMeStats: async () => userStatsResponseSchema.parse(await apiClient.get('/auth/me/stats')),
  acceptTerms: async () => apiClient.post('/auth/accept-terms'),
  deleteAccount: async () => apiClient.delete('/auth/me'),
};
