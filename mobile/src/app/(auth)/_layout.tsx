import { Redirect, Stack } from 'expo-router';

import { homeHref } from '@/lib/routes';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);
  if (isAuthenticated) return <Redirect href={homeHref(isAdmin, onboardingPending)} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
