import { CalendarBlankIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ScreenPlaceholder } from '@/components/screen-placeholder';
import { Button } from '@/components/ui/button';
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

  const [confirmDistance, setConfirmDistance] = useState<number | null | 'pending'>('pending');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  const isPending = shift.isPending || (shift.data !== null && (site.isPending || entry.isPending));

  const startClockIn = async () => {
    if (!shift.data || !site.data) return;
    setFlowError(null);
    // Fresh reading at the moment of truth.
    const coords = await location.read();
    const distanceM = distanceToSite(coords, site.data);
    if (distanceM !== null && distanceM <= site.data.geofence_radius_m) {
      clockIn.mutate(
        { shift: shift.data, site: site.data, coords, distanceM },
        { onError: (e) => setFlowError(e.message) }
      );
    } else {
      // Outside the fence (or no location): never hard-block — confirm + flag.
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
        onSuccess: () => setConfirmOpen(false),
        onError: (e) => {
          setConfirmOpen(false);
          setFlowError(e.message);
        },
      }
    );
  };

  const doClockOut = async () => {
    if (!entry.data || !shift.data) return;
    setFlowError(null);
    const coords = await location.read();
    clockOut.mutate(
      { entryId: entry.data.id, shiftId: shift.data.id, coords },
      { onError: (e) => setFlowError(e.message) }
    );
  };

  if (isPending) {
    return (
      <View className="flex-1 gap-3 bg-background p-4">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </View>
    );
  }

  if (!shift.data || !site.data) {
    return (
      <View className="flex-1 bg-background">
        <ScreenPlaceholder title="No upcoming shifts" />
      </View>
    );
  }

  const inShift = entry.data != null && shift.data.status === 'in_progress';

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 p-4 pb-32">
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

        {flowError && <Text className="text-sm text-danger">{flowError}</Text>}

        <View className="flex-row items-center gap-2 opacity-60">
          <CalendarBlankIcon size={14} color="#78716C" />
          <Text className="text-xs text-muted-foreground">
            Your full roster lives in the Schedule tab.
          </Text>
        </View>
      </ScrollView>

      {/* The dominant action, pinned to the thumb zone. */}
      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-background p-4">
        {inShift ? (
          <Button
            size="lg"
            variant="destructive"
            className="h-14"
            disabled={clockOut.isPending}
            onPress={() => void doClockOut()}>
            <Text className="text-base font-semibold">
              {clockOut.isPending ? 'Clocking out…' : 'Clock Out'}
            </Text>
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-14"
            disabled={clockIn.isPending}
            onPress={() => void startClockIn()}>
            <Text className="text-base font-semibold">
              {clockIn.isPending ? 'Clocking in…' : 'Clock In'}
            </Text>
          </Button>
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
