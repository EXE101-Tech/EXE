import { Redirect, Tabs } from 'expo-router';

import { BottomTabBar } from '@/components/navigation/bottom-tab-bar';
import { useAuthStore } from '@/stores/auth-store';

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => <BottomTabBar />}
    >
      <Tabs.Screen name="forum" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="gamerooms" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="premium" />
      <Tabs.Screen name="teams" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="map" />
    </Tabs>
  );
}
