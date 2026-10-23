// Ported from client/src/shared/utils/sportExperienceSort.js — keep behavior identical so rooms and clubs
// are ordered the same way on mobile as on web.

import { SPORT_KEY_BY_NAME } from '@/lib/constants';
import type { UserSportResponse } from '@/schemas/auth';

const EXPERIENCE_RANKS: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

export type SportExperienceMap = Map<string, number>;

export function normalizeSportKey(value: unknown): string {
  const normalized = String(value ?? '').trim().toLocaleLowerCase('vi');
  return SPORT_KEY_BY_NAME[normalized] ?? normalized;
}

/** Highest skill rank (1-4) the user has for each sport, keyed by normalized sport key. */
export function createSportExperienceMap(userSports?: UserSportResponse[] | null): SportExperienceMap {
  const experienceBySport: SportExperienceMap = new Map();

  for (const userSport of userSports ?? []) {
    const sportKey = normalizeSportKey(userSport?.sport?.name);
    const rank = EXPERIENCE_RANKS[String(userSport?.skill_level ?? '').trim().toLocaleLowerCase('en')];
    if (!sportKey || !rank) continue;
    experienceBySport.set(sportKey, Math.max(experienceBySport.get(sportKey) ?? 0, rank));
  }

  return experienceBySport;
}

interface Sortable {
  created_at?: string | null;
  is_priority?: boolean;
}

/**
 * Orders items so sports the viewer plays at a higher level come first. Inside the same experience tier a
 * priority room (Premium host, starting soon, still has seats) is boosted, then newest first. The priority
 * boost can never lift an item above a sport the viewer has ranked higher.
 */
export function sortBySportExperience<T extends Sortable>(
  items: T[],
  experienceBySport: SportExperienceMap,
  getSport: (item: T) => unknown,
): T[] {
  return [...items].sort((left, right) => {
    const leftRank = experienceBySport.get(normalizeSportKey(getSport(left))) ?? 0;
    const rightRank = experienceBySport.get(normalizeSportKey(getSport(right))) ?? 0;
    if (leftRank !== rightRank) return rightRank - leftRank;

    const leftPriority = left.is_priority ? 1 : 0;
    const rightPriority = right.is_priority ? 1 : 0;
    if (leftPriority !== rightPriority) return rightPriority - leftPriority;

    const leftCreatedAt = Date.parse(left.created_at ?? '') || 0;
    const rightCreatedAt = Date.parse(right.created_at ?? '') || 0;
    return rightCreatedAt - leftCreatedAt;
  });
}
