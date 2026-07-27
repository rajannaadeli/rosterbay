import { Stack, useLocalSearchParams } from 'expo-router';
import {
  CameraIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  MapPinIcon,
  WarningIcon,
  XCircleIcon,
} from 'phosphor-react-native';
import { Image, ScrollView, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StatusPill } from '@/components/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useShift } from '@/features/schedule/hooks';
import { useShiftIssues, useShiftTasks, useSite } from '@/features/today/hooks';
import { useCertTypes, useMyCerts } from '@/features/wallet/hooks';
import { useColors } from '@/lib/colors';
import { formatACST, formatShiftRange } from '@/lib/format';
import { proofPhotoUrl } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shift = useShift(id ?? '');
  const site = useSite(shift.data?.site_id);
  // The shift's own checklist — a snapshot taken when it was created, not the
  // site's current templates.
  const tasks = useShiftTasks(shift.data?.id, true);
  const issues = useShiftIssues(shift.data?.id);
  const certTypes = useCertTypes();
  const myCerts = useMyCerts();
  const c = useColors();

  const taskList = tasks.data ?? [];
  const doneCount = taskList.filter((task) => task.done).length;
  const finished = shift.data?.status === 'completed';

  const isPending = shift.isPending || site.isPending;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Shift details" />
      {isPending || !shift.data || !site.data ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-52 rounded-[20px]" />
          <Skeleton className="h-32 rounded-[18px]" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 p-4 pb-10">
          <View className="gap-4 rounded-[20px] bg-card p-5 shadow-sm">
            <View className="flex-row items-start justify-between gap-2">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-2xl font-bold tracking-tight" numberOfLines={2}>
                  {site.data.name}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <MapPinIcon size={13} weight="fill" color={c.mutedForeground} />
                  <Text className="flex-1 text-sm text-muted-foreground" numberOfLines={1}>
                    {site.data.address}
                  </Text>
                </View>
              </View>
              {shift.data.status === 'in_progress' && <StatusPill tone="success" label="On site" />}
              {shift.data.status === 'completed' && (
                <StatusPill tone="success" label="Completed" showIcon={false} />
              )}
            </View>
            <View className="gap-1 rounded-[14px] bg-muted p-4">
              <Text className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {formatACST(shift.data.starts_at, 'EEEE, d MMMM')}
              </Text>
              <Text className="text-2xl font-bold tabular-nums tracking-tight">
                {formatShiftRange(shift.data.starts_at, shift.data.ends_at)}
              </Text>
              {shift.data.role_required && (
                <Text className="text-xs text-muted-foreground">{shift.data.role_required}</Text>
              )}
            </View>
            {shift.data.notes && !shift.data.notes.startsWith('OVERRIDE:') && (
              <Text className="rounded-[12px] bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                {shift.data.notes}
              </Text>
            )}
          </View>

          {site.data.required_cert_type_ids.length > 0 && (
            <View className="gap-2.5 rounded-[18px] bg-card p-5 shadow-sm">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Requirements
              </Text>
              {site.data.required_cert_type_ids.map((certTypeId) => {
                const certType = (certTypes.data ?? []).find((ct) => ct.id === certTypeId);
                const met = (myCerts.data ?? []).some(
                  (cert) => cert.cert_type_id === certTypeId && cert.status !== 'expired'
                );
                return (
                  <View key={certTypeId} className="flex-row items-center gap-2">
                    {met ? (
                      <CheckCircleIcon size={17} weight="fill" color={c.success} />
                    ) : (
                      <XCircleIcon size={17} weight="fill" color={c.danger} />
                    )}
                    <Text className="text-sm" style={{ color: met ? c.foreground : c.danger }}>
                      {certType?.name ?? 'Certificate'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {taskList.length > 0 && (
            <View className="gap-3 rounded-[18px] bg-card p-5 shadow-sm">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tasks on this shift
                </Text>
                {finished && (
                  <Text
                    className={cn(
                      'text-xs font-semibold tabular-nums',
                      doneCount === taskList.length ? 'text-success' : 'text-warning'
                    )}>
                    {doneCount}/{taskList.length} completed
                  </Text>
                )}
              </View>

              {taskList.map((task) => {
                const photo = proofPhotoUrl(task.photo_url);
                return (
                  <View key={task.id} className="flex-row items-center gap-2.5">
                    {task.done ? (
                      <CheckCircleIcon size={16} weight="fill" color={c.success} />
                    ) : (
                      <CheckSquareIcon size={16} weight="duotone" color={c.mutedForeground} />
                    )}
                    <View className="flex-1 gap-1">
                      <Text
                        className={cn('text-sm', task.done && 'text-muted-foreground')}
                        numberOfLines={2}>
                        {task.title}
                      </Text>
                      {task.source === 'adhoc' && (
                        <View className="self-start rounded-full bg-primary/10 px-2 py-0.5">
                          <Text className="text-[10px] font-medium text-primary">
                            Added by supervisor
                          </Text>
                        </View>
                      )}
                    </View>
                    {photo ? (
                      <Image
                        source={{ uri: photo }}
                        className="size-9 rounded-lg bg-muted"
                        accessibilityIgnoresInvertColors
                      />
                    ) : task.requires_photo ? (
                      <CameraIcon size={15} weight="duotone" color={c.primary} />
                    ) : null}
                  </View>
                );
              })}

              {finished && (
                <Text className="text-xs text-muted-foreground">
                  This shift is finished — the checklist is a record now.
                </Text>
              )}
            </View>
          )}

          {(issues.data?.length ?? 0) > 0 && (
            <View className="gap-3 rounded-[18px] bg-card p-5 shadow-sm">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Issues you reported
              </Text>
              {issues.data?.map((issue) => {
                const photo = proofPhotoUrl(issue.photo_url);
                return (
                  <View key={issue.id} className="gap-2 rounded-[12px] bg-muted/50 p-3">
                    <View className="flex-row items-start gap-2.5">
                      <WarningIcon
                        size={16}
                        weight="duotone"
                        color={issue.status === 'open' ? c.danger : c.mutedForeground}
                      />
                      <Text className="flex-1 text-sm">{issue.note}</Text>
                      {photo && (
                        <Image
                          source={{ uri: photo }}
                          className="size-9 rounded-lg bg-muted"
                          accessibilityIgnoresInvertColors
                        />
                      )}
                    </View>
                    <View className="flex-row items-center gap-2">
                      {issue.status === 'acknowledged' ? (
                        <StatusPill tone="success" label="Acknowledged" />
                      ) : (
                        <StatusPill tone="warning" label="Awaiting review" />
                      )}
                      <Text className="text-[11px] text-muted-foreground">
                        {formatACST(issue.created_at, 'd MMM, h:mm a')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
