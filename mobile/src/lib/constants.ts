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

export const LOCATION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả khu vực' },
  ...[
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
    'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Tân Bình',
    'Quận Tân Phú', 'Quận Phú Nhuận', 'Quận Gò Vấp', 'Quận Bình Tân', 'TP. Thủ Đức',
    'Huyện Bình Chánh', 'Huyện Hóc Môn', 'Huyện Củ Chi', 'Huyện Nhà Bè', 'Huyện Cần Giờ',
  ].map((district) => ({
    value: district === 'TP. Thủ Đức' ? 'Thủ Đức' : district,
    label: district,
  })),
];

/** Areas a user can pick as their activity district (ported from client/src/shared/constants/districts.js). */
export const ACTIVITY_DISTRICTS: string[] = [
  'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
  'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Tân Bình',
  'Quận Tân Phú', 'Quận Phú Nhuận', 'Quận Gò Vấp', 'Quận Bình Tân', 'Quận Thủ Đức',
  'TP. Thủ Đức', 'Huyện Bình Chánh', 'Huyện Hóc Môn', 'Huyện Củ Chi', 'Huyện Nhà Bè', 'Huyện Cần Giờ',
];

/** Clubs owned by non-Premium accounts are capped at this many members (matches the server). */
export const BASIC_TEAM_MAX_MEMBERS = 15;

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
