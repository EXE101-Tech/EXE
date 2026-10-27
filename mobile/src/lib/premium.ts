import { isFutureTime } from '@/lib/slots';

interface PremiumFields {
  is_premium?: boolean;
  premium_until?: string | null;
}

/** Whether an API user object currently has Premium (flag from the server, or an unexpired premium_until). */
export function isPremiumUser(user?: PremiumFields | null): boolean {
  if (!user) return false;
  return Boolean(user.is_premium || (user.premium_until && isFutureTime(user.premium_until)));
}
