import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Redirect href="/(tabs)/profile" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
