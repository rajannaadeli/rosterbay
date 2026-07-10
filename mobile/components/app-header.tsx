import { router, usePathname } from 'expo-router';
import { BellIcon, SquaresFourIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DemoBanner } from '@/components/demo-banner';
import { Text } from '@/components/ui/text';
import { useSession } from '@/features/auth/hooks';

const TITLES: Record<string, string> = {
  '/': 'Today',
  '/schedule': 'Schedule',
  '/offers': 'Offers',
  '/wallet': 'Wallet',
};

/**
 * The one fixed app bar (WhiteFleet pattern): mounted once above the tab
 * navigator, so switching tabs never remounts or flickers the chrome.
 */
export function AppHeader() {
  const pathname = usePathname();
  const session = useSession();
  const initial = (session.data?.user.email?.[0] ?? 'L').toUpperCase();

  return (
    <SafeAreaView edges={['top']} className="border-b border-border bg-card">
      <View className="h-13 flex-row items-center gap-2.5 px-4">
        <View className="size-7 items-center justify-center rounded-lg bg-primary">
          <SquaresFourIcon size={16} weight="duotone" color="#FFFFFF" />
        </View>
        <Text className="flex-1 text-base font-semibold">{TITLES[pathname] ?? 'RosterBay'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={8}
          className="size-9 items-center justify-center rounded-lg active:bg-muted"
          onPress={() => router.push('/notifications')}>
          <BellIcon size={20} weight="duotone" color="#1C1917" />
        </Pressable>
        <View className="size-8 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-xs font-semibold text-primary">{initial}</Text>
        </View>
      </View>
      <DemoBanner />
    </SafeAreaView>
  );
}
