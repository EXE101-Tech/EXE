import type { Href } from 'expo-router';

/** Where a signed-in account lands: admins get their own console, members the community feed (after onboarding). */
export function homeHref(isAdmin: boolean | undefined, onboardingPending: boolean): Href {
  if (isAdmin) return '/admin' as Href;
  return onboardingPending ? '/onboarding' : '/(tabs)/forum';
}
