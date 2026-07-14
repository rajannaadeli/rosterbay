import { router } from 'expo-router';
import { CalendarBlankIcon, CaretDownIcon, CaretRightIcon } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusPill } from '@/components/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMyShifts, useSites } from '@/features/schedule/hooks';
import { useColors } from '@/lib/colors';
import type { Tables } from '@/lib/database.types';
import { formatACST, formatShiftRange } from '@/lib/format';

type Shift = Tables<'shifts'>;

function weekBucket(shift: Shift, todayYmd: string, nextMondayYmd: string, mondayAfterYmd: string) {
  const ymd = formatACST(shift.starts_at, 'yyyy-MM-dd');
  if (ymd < todayYmd) return 'past';
  if (ymd < nextMondayYmd) return 'this-week';
  if (ymd < mondayAfterYmd) return 'next-week';
  return 'later';
}

function mondayYmd(offsetWeeks: number): string {
  // ACST "today", walked back to Monday, plus offset weeks.
  const now = new Date();
  const acstYmd = formatACST(now, 'yyyy-MM-dd');
  const acstDow = Number(formatACST(now, 'i')); // ISO day 1–7
  const base = new Date(`${acstYmd}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - (acstDow - 1) + offsetWeeks * 7);
  return base.toISOString().slice(0, 10);
}

function ShiftRow({ shift, siteName, muted }: { shift: Shift; siteName: string; muted?: boolean }) {
  const c = useColors();
  const isToday = formatACST(shift.starts_at, 'yyyy-MM-dd') === formatACST(new Date(), 'yyyy-MM-dd');
  const live = shift.status === 'in_progress';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/shift/[id]', params: { id: shift.id } })}
      className={`mb-2.5 flex-row items-center gap-3 overflow-hidden rounded-[16px] bg-card p-3 shadow-sm active:opacity-80 ${muted ? 'opacity-60' : ''}`}>
      {live && <View className="-my-3 -ml-3 mr-0 h-auto w-1 self-stretch bg-success" />}
      <View
        className={`w-14 items-center justify-center rounded-[12px] py-2 ${isToday ? 'bg-primary/10' : 'bg-muted'}`}>
        <Text
          className={`text-[10px] font-semibold uppercase ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
          {formatACST(shift.starts_at, 'EEE')}
        </Text>
        <Text
          className={`text-lg font-bold tabular-nums ${isToday ? 'text-primary' : 'text-foreground'}`}>
          {formatACST(shift.starts_at, 'd')}
        </Text>
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold" numberOfLines={1}>
          {siteName}
        </Text>
        <Text className="text-[13px] tabular-nums text-muted-foreground">
          {formatShiftRange(shift.starts_at, shift.ends_at)}
          {shift.role_required ? ` · ${shift.role_required}` : ''}
        </Text>
      </View>
      {shift.status === 'in_progress' ? (
        <StatusPill tone="success" label="On site" />
      ) : (
        <CaretRightIcon size={16} color={c.faint} />
      )}
    </Pressable>
  );
}

export default function ScheduleScreen() {
  const shifts = useMyShifts();
  const sites = useSites();
  const c = useColors();
  const [showCompleted, setShowCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const siteNames = useMemo(
    () => new Map((sites.data ?? []).map((s) => [s.id, s.name])),
    [sites.data]
  );

  const sections = useMemo(() => {
    const todayYmd = formatACST(new Date(), 'yyyy-MM-dd');
    const nextMonday = mondayYmd(1);
    const mondayAfter = mondayYmd(2);

    const upcoming = (shifts.data ?? []).filter((s) => s.status !== 'completed');
    const completed = (shifts.data ?? []).filter((s) => s.status === 'completed');

    const byBucket = (bucket: string) =>
      upcoming
        .filter((s) => weekBucket(s, todayYmd, nextMonday, mondayAfter) === bucket)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    const result: { title: string; data: Shift[]; muted?: boolean }[] = [];
    const thisWeek = byBucket('this-week');
    const nextWeek = byBucket('next-week');
    const later = byBucket('later');
    if (thisWeek.length > 0) result.push({ title: 'This week', data: thisWeek });
    if (nextWeek.length > 0) result.push({ title: 'Next week', data: nextWeek });
    if (later.length > 0) result.push({ title: 'Later', data: later });
    result.push({ title: 'Completed', data: showCompleted ? completed : [], muted: true });
    return result;
  }, [shifts.data, showCompleted]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([shifts.refetch(), sites.refetch()]);
    setRefreshing(false);
  };

  if (shifts.isPending || sites.isPending) {
    return (
      <View className="flex-1 gap-2.5 bg-background p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-[16px]" />
        ))}
      </View>
    );
  }

  if ((shifts.data?.length ?? 0) === 0) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          icon={CalendarBlankIcon}
          title="No shifts yet"
          body="When Torrens rosters you on, your upcoming shifts appear here — grouped by week."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SectionList
        sections={sections}
        keyExtractor={(shift) => shift.id}
        contentContainerClassName="p-4 pb-10"
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.mutedForeground} />
        }
        renderSectionHeader={({ section }) =>
          section.title === 'Completed' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showCompleted }}
              onPress={() => setShowCompleted((v) => !v)}
              className="mb-2.5 mt-4 flex-row items-center gap-1.5">
              <Text className="text-lg font-bold tracking-tight text-muted-foreground">
                Completed
              </Text>
              {showCompleted ? (
                <CaretDownIcon size={16} weight="bold" color={c.mutedForeground} />
              ) : (
                <CaretRightIcon size={16} weight="bold" color={c.mutedForeground} />
              )}
            </Pressable>
          ) : (
            <View className="mb-2.5 mt-4 flex-row items-baseline gap-2">
              <Text className="text-lg font-bold tracking-tight">{section.title}</Text>
              <Text className="text-sm font-medium text-muted-foreground">
                {section.data.length}
              </Text>
            </View>
          )
        }
        renderItem={({ item, section }) => (
          <ShiftRow
            shift={item}
            siteName={siteNames.get(item.site_id) ?? 'Job site'}
            muted={section.muted}
          />
        )}
      />
    </View>
  );
}
