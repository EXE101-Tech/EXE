export const ACTIVE_SPORT_KEYS = new Set(['badminton', 'pickleball', 'football']);

const SPORT_KEY_BY_NAME = {
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

export function isActiveSport(sport) {
  const value = typeof sport === 'string' || typeof sport === 'number'
    ? String(sport)
    : sport?.key || sport?.name || '';
  const normalized = value.trim().toLowerCase();
  const key = SPORT_KEY_BY_NAME[normalized] || normalized;
  return ACTIVE_SPORT_KEYS.has(key);
}
