import { Stack, useLocalSearchParams } from 'expo-router';
import { CameraIcon, CheckCircleIcon, CheckSquareIcon, XCircleIcon } from 'phosphor-react-native';
import { ScrollView, View } from 'react-native';

import { StatusPill } from '@/components/status-pill';
import { Card, CardContent } from '@/components/ui/card';
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
      <Stack.Screen options={{ headerShown: true, title: 'Shift details' }} />
      {isPending || !shift.data || !site.data ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 p-4 pb-10">
          <Card>
            <CardContent className="gap-3 p-4">
              <View className="flex-row items-start justify-between gap-2">
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="text-lg font-semibold">{site.data.name}</Text>
                  <Text className="text-sm text-muted-foreground">{site.data.address}</Text>
                </View>
                {shift.data.status === 'in_progress' && (
                  <StatusPill tone="success" label="On site" />
                )}
                {shift.data.status === 'completed' && (
                  <StatusPill tone="success" label="Completed" showIcon={false} />
                )}
              </View>
              <View className="gap-0.5 rounded-[12px] bg-muted px-3 py-2.5">
                <Text className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {formatACST(shift.data.starts_at, 'EEEE, d MMMM')}
                </Text>
                <Text className="text-base font-bold tabular-nums">
                  {formatShiftRange(shift.data.starts_at, shift.data.ends_at)}
                </Text>
                {shift.data.role_required && (
                  <Text className="text-xs text-muted-foreground">{shift.data.role_required}</Text>
                )}
              </View>
              {shift.data.notes && !shift.data.notes.startsWith('OVERRIDE:') && (
                <Text className="text-sm text-muted-foreground">{shift.data.notes}</Text>
              )}
            </CardContent>
          </Card>

          {site.data.required_cert_type_ids.length > 0 && (
            <Card>
              <CardContent className="gap-2 p-4">
                <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Requirements
                </Text>
                {site.data.required_cert_type_ids.map((certTypeId) => {
                  const certType = (certTypes.data ?? []).find((c) => c.id === certTypeId);
                  const met = (myCerts.data ?? []).some(
                    (cert) => cert.cert_type_id === certTypeId && cert.status !== 'expired'
                  );
                  return (
                    <View key={certTypeId} className="flex-row items-center gap-1.5">
                      {met ? (
                        <CheckCircleIcon size={16} weight="fill" color={c.success} />
                      ) : (
                        <XCircleIcon size={16} weight="fill" color={c.danger} />
                      )}
                      <Text className="text-sm" style={{ color: met ? c.foreground : c.danger }}>
                        {certType?.name ?? 'Certificate'}
                      </Text>
                    </View>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {(templates.data?.length ?? 0) > 0 && (
            <Card>
              <CardContent className="gap-2 p-4">
                <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tasks on this shift
                </Text>
                {templates.data?.map((template) => (
                  <View key={template.id} className="flex-row items-center gap-2">
                    <CheckSquareIcon size={15} weight="duotone" color={c.mutedForeground} />
                    <Text className="flex-1 text-sm" numberOfLines={1}>
                      {template.title}
                    </Text>
                    {template.requires_photo && (
                      <CameraIcon size={14} weight="duotone" color={c.primary} />
                    )}
                  </View>
                ))}
              </CardContent>
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}
