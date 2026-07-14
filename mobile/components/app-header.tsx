import { router, usePathname } from 'expo-router';
import { BellIcon, CalendarCheckIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DemoBanner } from '@/components/demo-banner';
import { UserAvatar } from '@/components/user-avatar';
import { Text } from '@/components/ui/text';
import { useSession } from '@/features/auth/hooks';
import { useMyNotifications, useNotificationsRealtime } from '@/features/offers/hooks';

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
  const notifications = useMyNotifications();
  useNotificationsRealtime();
  const unread = (notifications.data ?? []).filter((row) => !row.read).length;
  const workerName =
    (session.data?.user.user_metadata?.full_name as string | undefined) ??
    session.data?.user.email ??
    'Worker';

  return (
    <SafeAreaView edges={['top']} className="border-b border-border bg-card">
      <View className="h-13 flex-row items-center gap-2.5 px-4">
        <View className="size-7 items-center justify-center rounded-lg bg-primary">
          <CalendarCheckIcon size={16} weight="duotone" color="#FFFFFF" />
        </View>
        <Text className="flex-1 text-base font-semibold">{TITLES[pathname] ?? 'RosterBay'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={8}
          className="size-9 items-center justify-center rounded-lg active:bg-muted"
          onPress={() => router.push('/notifications')}>
          <BellIcon size={20} weight="duotone" color="#1C1917" />
          {unread > 0 && (
            <View className="absolute right-0.5 top-0.5 size-4 items-center justify-center rounded-full bg-danger">
              <Text className="text-[9px] font-semibold text-white">
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          )}
        </Pressable>
        <UserAvatar name={workerName} size="sm" />
      </View>
      <DemoBanner />
    </SafeAreaView>
  );
}
