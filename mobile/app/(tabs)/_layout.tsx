import { Redirect, Tabs } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AccountSheet } from '@/components/account-sheet';
import { AppHeader } from '@/components/app-header';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useSession } from '@/features/auth/hooks';

export default function TabsLayout() {
  const session = useSession();
  const [accountOpen, setAccountOpen] = useState(false);

  if (!session.isPending && !session.data) {
    return <Redirect href="/sign-in" />;
  }

  const workerName =
    (session.data?.user.user_metadata?.full_name as string | undefined) ??
    session.data?.user.email ??
    'Worker';
  const role =
    (session.data?.user.user_metadata?.role as string | undefined) ??
    'Torrens Facility Services';

  // One fixed header + one fixed tab bar; only the content between them
  // changes on navigation (WhiteFleet shell contract — no chrome remounts).
  return (
    <View className="flex-1 bg-background">
      <AppHeader onOpenAccount={() => setAccountOpen(true)} />
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
        <Tabs.Screen name="offers" options={{ title: 'Offers' }} />
        <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
      </Tabs>

      {/* Rendered here (full-screen, inside the navigator) so the sheet paints
          above the tabs while keeping navigation context. */}
      {accountOpen && (
        <AccountSheet name={workerName} subtitle={role} onClose={() => setAccountOpen(false)} />
      )}
    </View>
  );
}
