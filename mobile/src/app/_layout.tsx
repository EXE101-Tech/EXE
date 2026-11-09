import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';

import { BrandSplash } from '@/components/brand/brand-splash';
import { AppDialog } from '@/components/ui/app-dialog';
import { ToastBanner } from '@/components/ui/toast-banner';
import { queryClient, wireAppStateToQueryFocus } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { hydrateTheme } from '@/stores/theme-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [splashVisible, setSplashVisible] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    hydrate();
    hydrateTheme();
  }, [hydrate]);

  useEffect(() => wireAppStateToQueryFocus(), []);

  const ready = hydrated && (fontsLoaded || fontError);

  useEffect(() => {
    if (!ready) return;
    // Let the in-app splash paint a frame first, so the system splash hands over to it without a flash.
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => SplashScreen.hideAsync().catch(() => {})));
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  const finishSplash = useCallback(() => setSplashVisible(false), []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="admin" />
          </Stack>
          <ToastBanner />
          <AppDialog />
          {splashVisible ? <BrandSplash onFinish={finishSplash} /> : null}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
