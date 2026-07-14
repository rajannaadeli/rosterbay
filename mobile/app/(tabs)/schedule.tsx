import { router } from 'expo-router';
import { CalendarBlankIcon, CaretDownIcon, CaretRightIcon } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';

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
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/shift/[id]', params: { id: shift.id } })}
      className={`mb-2.5 flex-row items-center gap-3 rounded-[16px] border border-border bg-card p-3 shadow-sm active:bg-muted/50 ${muted ? 'opacity-60' : ''}`}>
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
      <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
        <View className="rounded-full bg-muted p-5">
          <CalendarBlankIcon size={32} weight="duotone" color={c.mutedForeground} />
        </View>
        <Text className="text-lg font-bold">No shifts yet</Text>
        <Text className="text-center text-sm text-muted-foreground">
          When Torrens rosters you on, your shifts appear here.
        </Text>
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
              className="mb-2.5 mt-3 flex-row items-center gap-1.5">
              {showCompleted ? (
                <CaretDownIcon size={15} color={c.mutedForeground} />
              ) : (
                <CaretRightIcon size={15} color={c.mutedForeground} />
              )}
              <Text className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                Completed
              </Text>
            </Pressable>
          ) : (
            <Text className="mb-2.5 mt-3 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </Text>
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
