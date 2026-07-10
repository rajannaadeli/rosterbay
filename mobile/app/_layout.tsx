import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'expo-router/react-navigation';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { NAV_THEME } from '@/lib/theme';
import { queryClient } from '@/lib/query';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  // Light mode is canonical for RosterBay — the dark nav theme resolves to the
  // same light tokens on purpose.
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME.light}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="add-document" options={{ presentation: 'modal' }} />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
