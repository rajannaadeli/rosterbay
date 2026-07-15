import * as Haptics from 'expo-haptics';
import { CalendarBlankIcon, SignInIcon, SignOutIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useSession } from '@/features/auth/hooks';
import { InShiftCard } from '@/features/today/components/in-shift-card';
import { GeofenceConfirmSheet, ReportIssueSheet } from '@/features/today/components/sheets';
import { NextShiftCard } from '@/features/today/components/next-shift-card';
import {
  distanceToSite,
  useActiveEntry,
  useClockIn,
  useClockOut,
  useLocation,
  useMyShift,
  useReportIssue,
  useSite,
} from '@/features/today/hooks';
import { useCertTypes, useMyCerts } from '@/features/wallet/hooks';
import { useColors } from '@/lib/colors';
import { formatACST } from '@/lib/format';

function greeting(): string {
  const hour = Number(formatACST(new Date(), 'H'));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function tap() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
function confirmHaptic() {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export default function TodayScreen() {
  const session = useSession();
  const shift = useMyShift();
  const site = useSite(shift.data?.site_id);
  const entry = useActiveEntry(shift.data?.id);
  const certTypes = useCertTypes();
  const myCerts = useMyCerts();
  const location = useLocation();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const reportIssue = useReportIssue();
  const c = useColors();

  const [confirmDistance, setConfirmDistance] = useState<number | null | 'pending'>('pending');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isPending = shift.isPending || (shift.data !== null && (site.isPending || entry.isPending));
  const firstName =
    ((session.data?.user.user_metadata?.full_name as string | undefined) ?? 'there').split(' ')[0];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([shift.refetch(), site.refetch(), entry.refetch(), myCerts.refetch()]);
    setRefreshing(false);
  };

  const startClockIn = () => {
    if (!shift.data || !site.data) return;
    setFlowError(null);
    tap();
    // Use the already-warm location (read on mount) — never block the tap on a
    // fresh GPS fix. Within the fence we clock in optimistically and the screen
    // flips to the in-shift view instantly; otherwise confirm (never block).
    const coords = location.coords;
    const distanceM = distanceToSite(coords, site.data);
    if (distanceM !== null && distanceM <= site.data.geofence_radius_m) {
      clockIn.mutate(
        { shift: shift.data, site: site.data, coords, distanceM },
        { onSuccess: confirmHaptic, onError: (e) => setFlowError(e.message) }
      );
    } else {
      setConfirmDistance(distanceM);
      setConfirmOpen(true);
    }
  };

  const confirmClockIn = () => {
    if (!shift.data || !site.data) return;
    clockIn.mutate(
      {
        shift: shift.data,
        site: site.data,
        coords: location.coords,
        distanceM: confirmDistance === 'pending' ? null : confirmDistance,
      },
      {
        onSuccess: () => {
          confirmHaptic();
          setConfirmOpen(false);
        },
        onError: (e) => {
          setConfirmOpen(false);
          setFlowError(e.message);
        },
      }
    );
  };

  const doClockOut = () => {
    if (!entry.data || !shift.data) return;
    setFlowError(null);
    tap();
    // Optimistic + warm coords — the screen leaves the in-shift view instantly.
    clockOut.mutate(
      { entryId: entry.data.id, shiftId: shift.data.id, coords: location.coords },
      { onSuccess: confirmHaptic, onError: (e) => setFlowError(e.message) }
    );
  };

  if (isPending) {
    return (
      <View className="flex-1 gap-4 bg-background p-4">
        <View className="gap-1.5 pt-1">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-7 w-52 rounded-md" />
        </View>
        <Skeleton className="h-60 rounded-[20px]" />
        <Skeleton className="h-16 rounded-[16px]" />
      </View>
    );
  }

  if (!shift.data || !site.data) {
    return (
      <View className="flex-1 bg-background">
        <View className="gap-0.5 p-4 pt-3">
          <Text className="text-sm text-muted-foreground">
            {formatACST(new Date(), 'EEEE, d MMMM')}
          </Text>
          <Text className="text-2xl font-bold tracking-tight">
            {greeting()}, {firstName}
          </Text>
        </View>
        <EmptyState
          icon={CalendarBlankIcon}
          title="No shifts scheduled"
          body="When Torrens rosters you on, your next shift shows up here. Your full roster lives in the Schedule tab."
        />
      </View>
    );
  }

  const inShift = entry.data != null && shift.data.status === 'in_progress';

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-32"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.mutedForeground} />
        }>
        <View className="gap-0.5 pt-1">
          <Text className="text-sm text-muted-foreground">
            {formatACST(new Date(), 'EEEE, d MMMM')}
          </Text>
          <Text className="text-2xl font-bold tracking-tight">
            {greeting()}, {firstName}
          </Text>
        </View>

        {inShift && entry.data ? (
          <InShiftCard
            shift={shift.data}
            site={site.data}
            entry={entry.data}
            onReportIssue={() => setIssueOpen(true)}
          />
        ) : (
          <NextShiftCard
            shift={shift.data}
            site={site.data}
            distanceM={distanceToSite(location.coords, site.data)}
            locationLine={
              location.status === 'denied'
                ? 'Location permission denied'
                : location.status === 'unavailable'
                  ? 'Location unavailable'
                  : null
            }
            certTypes={certTypes.data ?? []}
            myCerts={myCerts.data ?? []}
          />
        )}

        {flowError && (
          <Text className="text-sm font-medium text-danger">{flowError}</Text>
        )}
      </ScrollView>

      {/* The dominant action, pinned to the thumb zone. */}
      <View className="absolute inset-x-0 bottom-0 bg-background px-4 pb-2 pt-3">
        {inShift ? (
          <PrimaryAction
            label={clockOut.isPending ? 'Clocking out…' : 'Clock Out'}
            icon={<SignOutIcon size={16} weight="bold" color="#FFFFFF" />}
            tone="danger"
            disabled={clockOut.isPending}
            onPress={doClockOut}
          />
        ) : (
          <PrimaryAction
            label={clockIn.isPending ? 'Clocking in…' : 'Clock In'}
            icon={<SignInIcon size={16} weight="bold" color="#FFFFFF" />}
            tone="primary"
            disabled={clockIn.isPending}
            onPress={startClockIn}
          />
        )}
      </View>

      {confirmOpen && (
        <GeofenceConfirmSheet
          siteName={site.data.name}
          distanceM={confirmDistance === 'pending' ? null : confirmDistance}
          busy={clockIn.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmClockIn}
        />
      )}

      {issueOpen && shift.data && (
        <ReportIssueSheet
          busy={reportIssue.isPending}
          errorMessage={reportIssue.isError ? reportIssue.error.message : null}
          onClose={() => setIssueOpen(false)}
          onSubmit={(note, photo) => {
            if (!session.data) return;
            reportIssue.mutate(
              {
                companyId: shift.data!.company_id,
                shiftId: shift.data!.id,
                workerId: session.data.user.id,
                note,
                ...(photo ? { photoBase64: photo.base64, mimeType: photo.mimeType } : {}),
              },
              { onSuccess: () => setIssueOpen(false) }
            );
          }}
        />
      )}
    </View>
  );
}

function PrimaryAction({
  label,
  icon,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  tone: 'primary' | 'danger';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`h-11 flex-row items-center justify-center gap-2.5 rounded-full shadow-sm active:opacity-90 ${
        tone === 'danger' ? 'bg-danger' : 'bg-primary'
      } ${disabled ? 'opacity-60' : ''}`}>
      {icon}
      <Text className="text-base font-bold text-white">{label}</Text>
    </Pressable>
  );
}
