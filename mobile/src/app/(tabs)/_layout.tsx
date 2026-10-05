import { Redirect, Tabs } from 'expo-router';

import { BottomTabBar } from '@/components/navigation/bottom-tab-bar';
import { homeHref } from '@/lib/routes';
import { useAuthStore } from '@/stores/auth-store';

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);

  const onboardingPending = useAuthStore((s) => s.onboardingPending);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (isAdmin) return <Redirect href={homeHref(true, false)} />;
  if (onboardingPending) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => <BottomTabBar />}
    >
      <Tabs.Screen name="forum" />
      <Tabs.Screen name="gamerooms" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="premium" />
      <Tabs.Screen name="teams" />
      <Tabs.Screen name="search" />
    </Tabs>
  );
}
