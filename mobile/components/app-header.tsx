import { router, usePathname } from 'expo-router';
import { BellIcon, CalendarCheckIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSheet } from '@/components/account-sheet';
import { DemoBanner } from '@/components/demo-banner';
import { UserAvatar } from '@/components/user-avatar';
import { Text } from '@/components/ui/text';
import { useSession } from '@/features/auth/hooks';
import { useMyNotifications, useNotificationsRealtime } from '@/features/offers/hooks';
import { useColors } from '@/lib/colors';

const TITLES: Record<string, string> = {
  '/': 'Today',
  '/schedule': 'Schedule',
  '/offers': 'Offers',
  '/wallet': 'Wallet',
};

/**
 * The one fixed app bar (WhiteFleet pattern): mounted once above the tab
 * navigator, so switching tabs never remounts or flickers the chrome. The
 * avatar opens the account sheet (appearance + sign out).
 */
export function AppHeader() {
  const pathname = usePathname();
  const session = useSession();
  const notifications = useMyNotifications();
  const c = useColors();
  const [accountOpen, setAccountOpen] = useState(false);
  useNotificationsRealtime();

  const unread = (notifications.data ?? []).filter((row) => !row.read).length;
  const workerName =
    (session.data?.user.user_metadata?.full_name as string | undefined) ??
    session.data?.user.email ??
    'Worker';
  const role =
    (session.data?.user.user_metadata?.role as string | undefined) ??
    'Torrens Facility Services';

  return (
    <SafeAreaView edges={['top']} className="border-b border-border bg-card">
      <View className="h-14 flex-row items-center gap-2.5 px-4">
        <View className="size-8 items-center justify-center rounded-[10px] bg-primary">
          <CalendarCheckIcon size={17} weight="fill" color={c.onPrimary} />
        </View>
        <Text className="flex-1 text-lg font-bold tracking-tight">{TITLES[pathname] ?? 'RosterBay'}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          hitSlop={8}
          className="size-10 items-center justify-center rounded-full active:bg-muted"
          onPress={() => router.push('/notifications')}>
          <BellIcon size={21} weight="regular" color={c.foreground} />
          {unread > 0 && (
            <View className="absolute right-1 top-1 size-4 items-center justify-center rounded-full border border-card bg-danger">
              <Text className="text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account"
          hitSlop={6}
          onPress={() => setAccountOpen(true)}
          className="rounded-full active:opacity-80">
          <UserAvatar name={workerName} size="sm" />
        </Pressable>
      </View>
      <DemoBanner />

      {accountOpen && (
        <AccountSheet name={workerName} subtitle={role} onClose={() => setAccountOpen(false)} />
      )}
    </SafeAreaView>
  );
}
