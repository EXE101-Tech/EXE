const SPORT_KEYS_BY_NAME = new Map([
  ['badminton', 'badminton'],
  ['cầu lông', 'badminton'],
  ['football', 'football'],
  ['bóng đá', 'football'],
  ['pickleball', 'pickleball'],
  ['tennis', 'tennis'],
  ['basketball', 'basketball'],
  ['bóng rổ', 'basketball'],
  ['volleyball', 'volleyball'],
  ['bóng chuyền', 'volleyball'],
]);

const EXPERIENCE_RANKS = new Map([
  ['beginner', 1],
  ['intermediate', 2],
  ['advanced', 3],
  ['expert', 4],
]);

export function normalizeSportKey(value) {
  const normalized = String(value || '').trim().toLocaleLowerCase('vi');
  return SPORT_KEYS_BY_NAME.get(normalized) || normalized;
}

export function createSportExperienceMap(userSports) {
  const experienceBySport = new Map();

  for (const userSport of Array.isArray(userSports) ? userSports : []) {
    const sportName = userSport?.sport?.name || userSport?.sport_name || userSport?.sport_id;
    const sportKey = normalizeSportKey(sportName);
    const level = String(userSport?.skill_level || '').trim().toLocaleLowerCase('en');
    const rank = EXPERIENCE_RANKS.get(level);

    if (!sportKey || !rank) continue;
    experienceBySport.set(sportKey, Math.max(experienceBySport.get(sportKey) || 0, rank));
  }

  return experienceBySport;
}

export function sortBySportExperience(items, experienceBySport, getSport, getCreatedAt = (item) => item.created_at) {
  return [...items].sort((left, right) => {
    const leftRank = experienceBySport.get(normalizeSportKey(getSport(left))) || 0;
    const rightRank = experienceBySport.get(normalizeSportKey(getSport(right))) || 0;
    if (leftRank !== rightRank) return rightRank - leftRank;

    const leftCreatedAt = Date.parse(getCreatedAt(left) || '') || 0;
    const rightCreatedAt = Date.parse(getCreatedAt(right) || '') || 0;
    return rightCreatedAt - leftCreatedAt;
  });
}
