import { CheckCircleIcon, MapPinIcon, XCircleIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Views, Tables } from '@/lib/database.types';
import { formatACST } from '@/lib/format';

function countdownText(startsAt: string, endsAt: string): string {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (now >= start && now < end) return 'In progress window';
  const diffMin = Math.round(Math.abs(start - now) / 60_000);
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  const span = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return now < start ? `starts in ${span}` : `started ${span} ago`;
}

function distanceText(distanceM: number | null): string | null {
  if (distanceM === null) return null;
  if (distanceM < 1000) return `${distanceM} m away`;
  return `${(distanceM / 1000).toFixed(1)} km away`;
}

interface NextShiftCardProps {
  shift: Tables<'shifts'>;
  site: Tables<'job_sites'>;
  distanceM: number | null;
  locationLine: string | null;
  certTypes: Tables<'cert_types'>[];
  myCerts: Views<'worker_certs_with_status'>[];
}

export function NextShiftCard({
  shift,
  site,
  distanceM,
  locationLine,
  certTypes,
  myCerts,
}: NextShiftCardProps) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const distance = distanceText(distanceM);
  const requirements = site.required_cert_type_ids.map((certTypeId) => {
    const certType = certTypes.find((c) => c.id === certTypeId);
    const met = myCerts.some(
      (cert) => cert.cert_type_id === certTypeId && cert.status !== 'expired'
    );
    return { id: certTypeId, name: certType?.name ?? 'Certificate', met };
  });

  return (
    <Card>
      <CardContent className="gap-3 p-4">
        <View className="gap-0.5">
          <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Next shift
          </Text>
          <Text className="text-lg font-semibold">{site.name}</Text>
          <Text className="text-sm text-muted-foreground">{site.address}</Text>
        </View>

        <View className="flex-row items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
          <Text className="text-sm font-medium tabular-nums">
            {formatACST(shift.starts_at, 'EEE d MMM · h:mma').toLowerCase()}–
            {formatACST(shift.ends_at, 'h:mma').toLowerCase()}
          </Text>
          <Text className="text-sm font-semibold text-primary">
            {countdownText(shift.starts_at, shift.ends_at)}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <MapPinIcon size={14} weight="duotone" color="#78716C" />
          <Text className="text-sm text-muted-foreground">
            {distance ?? locationLine ?? 'Locating…'}
          </Text>
        </View>

        {requirements.length > 0 && (
          <View className="gap-1">
            <Text className="text-xs font-medium text-muted-foreground">Site requirements</Text>
            {requirements.map((req) => (
              <View key={req.id} className="flex-row items-center gap-1.5">
                {req.met ? (
                  <CheckCircleIcon size={15} weight="duotone" color="#16A34A" />
                ) : (
                  <XCircleIcon size={15} weight="duotone" color="#DC2626" />
                )}
                <Text className={`text-sm ${req.met ? 'text-ink' : 'text-danger'}`}>
                  {req.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {shift.notes && !shift.notes.startsWith('OVERRIDE:') && (
          <Text className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {shift.notes}
          </Text>
        )}
      </CardContent>
    </Card>
  );
}
