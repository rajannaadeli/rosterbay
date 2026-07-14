import { Stack } from 'expo-router';
import { BellIcon, CheckCircleIcon, MegaphoneIcon, TrayIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

import { EmptyState } from '@/components/empty-state';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMarkAllNotificationsRead, useMyNotifications } from '@/features/offers/hooks';
import { useColors } from '@/lib/colors';
import { cn } from '@/lib/utils';

function kindIcon(kind: string) {
  if (kind === 'offer') return MegaphoneIcon;
  if (kind === 'offer_won' || kind === 'offer_filled') return CheckCircleIcon;
  return BellIcon;
}

export default function NotificationsScreen() {
  const notifications = useMyNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);

  const hasUnread = (notifications.data ?? []).some((row) => !row.read);
  useEffect(() => {
    if (hasUnread) markAllRead.mutate();
    // mark-read once per open, when unread rows exist
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Notifications" />
      {notifications.isPending ? (
        <View className="gap-2 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </View>
      ) : (
        <FlatList
          data={notifications.data ?? []}
          keyExtractor={(row) => row.id}
          contentContainerClassName="gap-2 p-4 pb-10"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await notifications.refetch();
                setRefreshing(false);
              }}
              tintColor={c.mutedForeground}
            />
          }
          ListEmptyComponent={
            <EmptyState
              className="py-24"
              icon={TrayIcon}
              title="Nothing yet"
              body="Shift offers and confirmations land here the moment they happen."
            />
          }
          renderItem={({ item: row }) => {
            const KindIcon = kindIcon(row.kind);
            return (
              <View
                className={cn(
                  'flex-row gap-3 rounded-[14px] bg-card p-3.5 shadow-sm',
                  !row.read && 'border-l-[3px] border-l-primary bg-primary/5'
                )}>
                <KindIcon size={18} weight="duotone" color={c.primary} />
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="text-sm font-medium">{row.title}</Text>
                  {row.body && <Text className="text-xs text-muted-foreground">{row.body}</Text>}
                  <Text className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
