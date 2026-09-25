// Ported from constants scattered across client/src/features/**/*.jsx
// (Home.jsx's LEVEL_META/SKILL_STYLE, GameRoom/Tournament/Team's sport pickers).

export type SportKey =
  | 'badminton'
  | 'football'
  | 'pickleball'
  | 'tennis'
  | 'basketball'
  | 'volleyball';

export const SPORTS: { key: SportKey; name: string; emoji: string }[] = [
  { key: 'badminton', name: 'Cầu lông', emoji: '🏸' },
  { key: 'football', name: 'Bóng đá', emoji: '⚽' },
  { key: 'pickleball', name: 'Pickleball', emoji: '🏓' },
  { key: 'tennis', name: 'Tennis', emoji: '🎾' },
  { key: 'basketball', name: 'Bóng rổ', emoji: '🏀' },
  { key: 'volleyball', name: 'Bóng chuyền', emoji: '🏐' },
];

export const SPORT_KEY_BY_NAME: Record<string, SportKey> = {
  badminton: 'badminton',
  'cầu lông': 'badminton',
  football: 'football',
  'bóng đá': 'football',
  pickleball: 'pickleball',
  tennis: 'tennis',
  basketball: 'basketball',
  'bóng rổ': 'basketball',
  volleyball: 'volleyball',
  'bóng chuyền': 'volleyball',
};

export type SkillLevel = 'Chưa biết' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export const SKILL_LEVELS: SkillLevel[] = ['Chưa biết', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

export const LEVEL_META: Record<SkillLevel, { label: string; percentage: number }> = {
  'Chưa biết': { label: 'Chưa biết', percentage: 10 },
  Beginner: { label: 'Mới chơi', percentage: 25 },
  Intermediate: { label: 'Trung bình', percentage: 50 },
  Advanced: { label: 'Khá', percentage: 75 },
  Expert: { label: 'Chuyên nghiệp', percentage: 95 },
};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:8000/api';
