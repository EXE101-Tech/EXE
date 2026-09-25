import { z } from 'zod';
import { sportResponseSchema } from './common';

export const tokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});
export type Token = z.infer<typeof tokenSchema>;

export const userLoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type UserLogin = z.infer<typeof userLoginSchema>;

export const userCreateSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  name: z.string().trim().min(1, 'Vui lòng nhập tên'),
});
export type UserCreate = z.infer<typeof userCreateSchema>;

export const userProfileResponseSchema = z.object({
  user_id: z.number(),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

export const userSportResponseSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  sport_id: z.number(),
  skill_level: z.string(),
  rating: z.number(),
  games_played: z.number(),
  sport: sportResponseSchema,
});
export type UserSportResponse = z.infer<typeof userSportResponseSchema>;

export const userResponseSchema = z.object({
  id: z.number(),
  email: z.string(),
  status: z.string(),
  owner_status: z.string().default('none'),
  created_at: z.string(),
  profile: userProfileResponseSchema.nullable().optional(),
  sports: z.array(userSportResponseSchema).default([]),
});
export type UserResponse = z.infer<typeof userResponseSchema>;

export const userProfileWithSportsUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  sports: z.record(z.string(), z.string()).optional(),
  avatar_url: z.string().optional(),
  cover_url: z.string().optional(),
});
export type UserProfileWithSportsUpdate = z.infer<typeof userProfileWithSportsUpdateSchema>;

export const userStatsResponseSchema = z.object({
  games_played: z.number().default(0),
  teams_joined: z.number().default(0),
  bookings_count: z.number().default(0),
  average_skill_rating: z.number().nullable().optional(),
});
export type UserStatsResponse = z.infer<typeof userStatsResponseSchema>;
