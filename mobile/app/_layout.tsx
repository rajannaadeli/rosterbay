import '@/global.css';

import { useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'expo-router/react-navigation';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { View } from 'react-native';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

import { useHydrateThemeMode } from '@/lib/theme-mode';

// NativeWind's css-interop writes to a shared value during render when
// className-driven styles change (e.g. a theme switch). That's internal to
// nativewind and harmless, so quiet Reanimated's strict render-time warning.
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { NAV_THEME } from '@/lib/theme';
import { queryClient } from '@/lib/query';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Keep splash screen visible while fonts load.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <RootNavigation />
      </QueryClientProvider>
    </View>
  );
}

/** The single color-scheme subscriber: nav chrome + status bar + the navigator. */
function RootNavigation() {
  useHydrateThemeMode();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <ThemeProvider value={dark ? NAV_THEME.dark : NAV_THEME.light}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="add-document" options={{ presentation: 'modal' }} />
      </Stack>
      <PortalHost />
    </ThemeProvider>
  );
}

