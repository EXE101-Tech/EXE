// Ported from constants scattered across client/src/features/**/*.jsx
// (Home.jsx's LEVEL_META/SKILL_STYLE, GameRoom/Tournament/Team's sport pickers).

export type SportKey =
  | 'badminton'
  | 'football'
  | 'pickleball'
  | 'tennis'
  | 'basketball'
  | 'volleyball';

/** Sports currently exposed by the app. Other keys remain recognized for existing records. */
export const ACTIVE_SPORT_KEYS: readonly SportKey[] = ['badminton', 'pickleball', 'football'];

export const SPORTS: { key: SportKey; name: string; emoji: string }[] = [
  { key: 'badminton', name: 'Cầu lông', emoji: '🏸' },
  { key: 'pickleball', name: 'Pickleball', emoji: '🏓' },
  { key: 'football', name: 'Bóng đá', emoji: '⚽' },
];

export const SPORT_KEY_BY_NAME: Record<string, SportKey> = {
  badminton: 'badminton',
  'cầu lông': 'badminton',
  football: 'football',
  'bóng đá': 'football',
  'đá banh': 'football',
  pickleball: 'pickleball',
  tennis: 'tennis',
  basketball: 'basketball',
  'bóng rổ': 'basketball',
  volleyball: 'volleyball',
  'bóng chuyền': 'volleyball',
};

export function isActiveSportName(name?: string | null): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  const key = SPORT_KEY_BY_NAME[normalized] ?? normalized as SportKey;
  return ACTIVE_SPORT_KEYS.includes(key);
}

export type SkillLevel = 'Chưa biết' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export const SKILL_LEVELS: SkillLevel[] = ['Chưa biết', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

export const LEVEL_META: Record<SkillLevel, { label: string; percentage: number }> = {
  'Chưa biết': { label: 'Chưa biết', percentage: 10 },
  Beginner: { label: 'Mới chơi', percentage: 25 },
  Intermediate: { label: 'Trung bình', percentage: 50 },
  Advanced: { label: 'Khá', percentage: 75 },
  Expert: { label: 'Chuyên nghiệp', percentage: 95 },
};

/** Shared with LFG posts' free-text `skill_level` and gamerooms' enum-validated `required_level`. */
export const SKILL_REQUIREMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Beginner', label: 'Mới chơi' },
  { value: 'Intermediate', label: 'Trung bình' },
  { value: 'Advanced', label: 'Khá / Giỏi' },
  { value: 'Expert', label: 'Chuyên nghiệp' },
];

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:8000/api';
