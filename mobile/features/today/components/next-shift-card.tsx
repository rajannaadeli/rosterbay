import { CheckCircleIcon, MapPinIcon, XCircleIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useColors } from '@/lib/colors';
import type { Views, Tables } from '@/lib/database.types';
import { formatACST, formatShiftRange } from '@/lib/format';

function countdownText(startsAt: string, endsAt: string): string {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (now >= start && now < end) return 'Happening now';
  const diffMin = Math.round(Math.abs(start - now) / 60_000);
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  const span = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return now < start ? `Starts in ${span}` : `Started ${span} ago`;
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
  const c = useColors();
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const distance = distanceText(distanceM);
  const requirements = site.required_cert_type_ids.map((certTypeId) => {
    const certType = certTypes.find((cc) => cc.id === certTypeId);
    const met = myCerts.some(
      (cert) => cert.cert_type_id === certTypeId && cert.status !== 'expired'
    );
    return { id: certTypeId, name: certType?.name ?? 'Certificate', met };
  });

  return (
    <View className="gap-4 rounded-[20px] border border-border bg-card p-5 shadow-sm">
      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase tracking-widest text-primary">
          Next shift
        </Text>
        <Text className="text-2xl font-bold tracking-tight" numberOfLines={2}>
          {site.name}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <MapPinIcon size={13} weight="fill" color={c.mutedForeground} />
          <Text className="flex-1 text-sm text-muted-foreground" numberOfLines={1}>
            {site.address}
          </Text>
        </View>
      </View>

      <View className="gap-2 rounded-[14px] bg-muted p-4">
        <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {formatACST(shift.starts_at, 'EEEE, d MMMM')}
        </Text>
        <View className="flex-row items-end justify-between">
          <Text className="text-2xl font-bold tabular-nums tracking-tight">
            {formatShiftRange(shift.starts_at, shift.ends_at)}
          </Text>
          <View className="rounded-full bg-primary/10 px-2.5 py-1">
            <Text className="text-xs font-semibold text-primary">
              {countdownText(shift.starts_at, shift.ends_at)}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-1.5">
        <MapPinIcon size={15} weight="duotone" color={c.mutedForeground} />
        <Text className="text-sm text-muted-foreground">
          {distance ?? locationLine ?? 'Locating…'}
        </Text>
      </View>

      {requirements.length > 0 && (
        <View className="gap-2 border-t border-border pt-3.5">
          <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Site requirements
          </Text>
          {requirements.map((req) => (
            <View key={req.id} className="flex-row items-center gap-2">
              {req.met ? (
                <CheckCircleIcon size={17} weight="fill" color={c.success} />
              ) : (
                <XCircleIcon size={17} weight="fill" color={c.danger} />
              )}
              <Text
                className="text-sm"
                style={{ color: req.met ? c.foreground : c.danger }}>
                {req.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {shift.notes && !shift.notes.startsWith('OVERRIDE:') && (
        <Text className="rounded-[12px] border border-border bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
          {shift.notes}
        </Text>
      )}
    </View>
  );
}
