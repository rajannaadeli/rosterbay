import { Redirect, Tabs, router } from 'expo-router';
import {
  BellIcon,
  CalendarBlankIcon,
  MegaphoneIcon,
  SunHorizonIcon,
  WalletIcon,
} from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { useSession } from '@/features/auth/hooks';

export default function TabsLayout() {
  const session = useSession();

  if (!session.isPending && !session.data) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View className="flex-1 bg-background">
      <Tabs
        screenOptions={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={8}
              className="mr-4"
              onPress={() => router.push('/notifications')}>
              <BellIcon size={22} weight="duotone" color="#1C1917" />
            </Pressable>
          ),
          header: undefined,
          tabBarActiveTintColor: '#0F766E',
          tabBarInactiveTintColor: '#78716C',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color }) => (
              <SunHorizonIcon size={22} weight="duotone" color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color }) => (
              <CalendarBlankIcon size={22} weight="duotone" color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="offers"
          options={{
            title: 'Offers',
            tabBarIcon: ({ color }) => (
              <MegaphoneIcon size={22} weight="duotone" color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color }) => (
              <WalletIcon size={22} weight="duotone" color={String(color)} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
