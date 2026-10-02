import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

/** Admin console: only a signed-in admin gets in; everyone else is sent back to their own home. */
export default function AdminLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!isAdmin) return <Redirect href="/(tabs)/forum" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
