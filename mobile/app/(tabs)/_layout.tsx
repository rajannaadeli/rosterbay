import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useSession } from '@/features/auth/hooks';

export default function TabsLayout() {
  const session = useSession();

  if (!session.isPending && !session.data) {
    return <Redirect href="/sign-in" />;
  }

  // One fixed header + one fixed tab bar; only the content between them
  // changes on navigation (WhiteFleet shell contract — no chrome remounts).
  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // Pause background tabs so off-screen timers/queries don't re-render.
          freezeOnBlur: true,
        }}>
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
        <Tabs.Screen name="offers" options={{ title: 'Offers' }} />
        <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
      </Tabs>
    </View>
  );
}
