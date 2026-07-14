import { Stack, useLocalSearchParams } from 'expo-router';
import {
  CameraIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  MapPinIcon,
  XCircleIcon,
} from 'phosphor-react-native';
import { ScrollView, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StatusPill } from '@/components/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useShift, useSiteTemplates } from '@/features/schedule/hooks';
import { useSite } from '@/features/today/hooks';
import { useCertTypes, useMyCerts } from '@/features/wallet/hooks';
import { useColors } from '@/lib/colors';
import { formatACST, formatShiftRange } from '@/lib/format';

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shift = useShift(id ?? '');
  const site = useSite(shift.data?.site_id);
  const templates = useSiteTemplates(shift.data?.site_id);
  const certTypes = useCertTypes();
  const myCerts = useMyCerts();
  const c = useColors();

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

          {(templates.data?.length ?? 0) > 0 && (
            <View className="gap-3 rounded-[18px] bg-card p-5 shadow-sm">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tasks on this shift
              </Text>
              {templates.data?.map((template) => (
                <View key={template.id} className="flex-row items-center gap-2.5">
                  <CheckSquareIcon size={16} weight="duotone" color={c.mutedForeground} />
                  <Text className="flex-1 text-sm" numberOfLines={1}>
                    {template.title}
                  </Text>
                  {template.requires_photo && (
                    <CameraIcon size={15} weight="duotone" color={c.primary} />
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
