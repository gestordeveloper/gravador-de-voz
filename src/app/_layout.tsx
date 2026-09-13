import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Onboarding } from '@/components/onboarding';
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/storage/onboardingStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecordingsStore } from '@/store/useRecordingsStore';
import { useSettingsStore } from '@/store/useSettingsStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const authStatus = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const resetSettings = useSettingsStore((s) => s.reset);
  const hydrateRecordings = useRecordingsStore((s) => s.hydrate);
  const resetRecordings = useRecordingsStore((s) => s.reset);

  useEffect(() => {
    (async () => {
      const [, seenOnboarding] = await Promise.all([hydrateAuth(), hasSeenOnboarding()]);
      setShowOnboarding(!seenOnboarding);
      setReady(true);
      await SplashScreen.hideAsync();
    })();
  }, [hydrateAuth]);

  // Recordings/settings live per-account in Appwrite, so they only make sense to fetch once we
  // know who's signed in — and must be cleared again on logout so the next account starts clean.
  useEffect(() => {
    if (authStatus === 'authenticated' && userId && !settingsHydrated) {
      void hydrateSettings(userId);
      void hydrateRecordings(userId);
    } else if (authStatus === 'unauthenticated') {
      resetSettings();
      resetRecordings();
    }
  }, [authStatus, userId, settingsHydrated, hydrateSettings, hydrateRecordings, resetSettings, resetRecordings]);

  if (!ready || authStatus === 'idle') {
    return null;
  }

  if (showOnboarding) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Onboarding
          onDone={() => {
            setShowOnboarding(false);
            void markOnboardingSeen();
          }}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={authStatus === 'authenticated'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recording/[id]" options={{ headerShown: true, title: '' }} />
        </Stack.Protected>
        <Stack.Protected guard={authStatus !== 'authenticated'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
