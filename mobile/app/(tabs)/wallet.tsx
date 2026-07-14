import { router } from 'expo-router';
import {
  CertificateIcon,
  CheckCircleIcon,
  FileTextIcon,
  PlusIcon,
  WarningCircleIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { CertPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCertTypes, useMyCerts } from '@/features/wallet/hooks';
import { useColors } from '@/lib/colors';
import type { CertStatus, Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';

type Cert = Views<'worker_certs_with_status'>;

function expiryLine(cert: Cert): string {
  if (cert.status === 'expired') {
    const days = Math.abs(cert.days_until_expiry);
    return `Expired ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}`;
  }
  if (cert.status === 'expiring_soon') {
    return `Expires in ${cert.days_until_expiry} day${cert.days_until_expiry === 1 ? '' : 's'}`;
  }
  return `Expires ${formatACST(cert.expires_on, 'd MMM yyyy')}`;
}

const EXPIRY_TEXT_CLASS: Record<CertStatus, string> = {
  valid: 'text-muted-foreground',
  expiring_soon: 'font-semibold text-warning',
  expired: 'font-semibold text-danger',
};

/** At-a-glance compliance banner, derived entirely from the loaded certs. */
function ComplianceSummary({ certs }: { certs: Cert[] }) {
  const c = useColors();
  const expired = certs.filter((x) => x.status === 'expired').length;
  const expiring = certs.filter((x) => x.status === 'expiring_soon').length;

  const tone = expired > 0 ? 'danger' : expiring > 0 ? 'warning' : 'success';
  const headline =
    expired > 0
      ? `${expired} document${expired === 1 ? '' : 's'} expired`
      : expiring > 0
        ? `${expiring} expiring soon`
        : "You're job-ready";
  const sub =
    tone === 'success'
      ? 'Every certificate is valid.'
      : 'Renew to stay eligible for site work.';

  const tint = { success: 'bg-success/10', warning: 'bg-warning/10', danger: 'bg-danger/10' }[tone];
  const iconColor = { success: c.success, warning: c.warning, danger: c.danger }[tone];

  return (
    <View className="mb-1 flex-row items-center gap-3 rounded-[18px] border border-border bg-card p-4 shadow-sm">
      <View className={`size-11 items-center justify-center rounded-full ${tint}`}>
        {tone === 'success' ? (
          <CheckCircleIcon size={24} weight="fill" color={iconColor} />
        ) : (
          <WarningCircleIcon size={24} weight="fill" color={iconColor} />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold tracking-tight">{headline}</Text>
        <Text className="text-[13px] text-muted-foreground">{sub}</Text>
      </View>
      <View className="items-center">
        <Text className="text-2xl font-bold tabular-nums">{certs.length}</Text>
        <Text className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          docs
        </Text>
      </View>
    </View>
  );
}

export default function WalletScreen() {
  const certs = useMyCerts();
  const certTypes = useCertTypes();
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);

  const typeById = new Map((certTypes.data ?? []).map((certType) => [certType.id, certType]));
  const isPending = certs.isPending || certTypes.isPending;
  const data = certs.data ?? [];

  return (
    <View className="flex-1 bg-background">
      {isPending ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-20 rounded-[18px]" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-[18px]" />
          ))}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(cert) => cert.id}
          contentContainerClassName="gap-3 p-4 pb-28"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await certs.refetch();
                setRefreshing(false);
              }}
              tintColor={c.mutedForeground}
            />
          }
          ListHeaderComponent={data.length > 0 ? <ComplianceSummary certs={data} /> : null}
          ListEmptyComponent={
            <View className="items-center gap-3 rounded-[18px] border border-dashed border-border px-6 py-16">
              <View className="rounded-full bg-muted p-5">
                <CertificateIcon size={28} weight="duotone" color={c.mutedForeground} />
              </View>
              <Text className="text-base font-bold">No documents yet</Text>
              <Text className="text-center text-sm text-muted-foreground">
                Add your first certificate — a photo from your camera roll is all it takes.
              </Text>
            </View>
          }
          renderItem={({ item: cert }) => {
            const certType = typeById.get(cert.cert_type_id);
            return (
              <View
                className={`gap-3 rounded-[18px] border border-border bg-card p-4 shadow-sm ${
                  cert.status === 'expired' ? 'border-l-[3px] border-l-danger' : ''
                }`}>
                <View className="flex-row items-start gap-3">
                  <View className="size-10 items-center justify-center rounded-[12px] bg-muted">
                    <CertificateIcon size={20} weight="duotone" color={c.mutedForeground} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[15px] font-semibold" numberOfLines={1}>
                      {certType?.name ?? 'Certificate'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{certType?.code}</Text>
                  </View>
                  <CertPill status={cert.status} />
                </View>

                <Text className={`text-sm ${EXPIRY_TEXT_CLASS[cert.status]}`}>
                  {expiryLine(cert)}
                </Text>

                <View className="flex-row items-center gap-1.5 border-t border-border pt-2.5">
                  <FileTextIcon size={13} color={c.mutedForeground} />
                  <Text className="text-xs text-muted-foreground">
                    {cert.file_url ? 'Document attached' : 'No file attached'} · Issued{' '}
                    {formatACST(cert.issued_on, 'd MMM yyyy')}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Primary action pinned to the thumb zone. */}
      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-card px-4 pb-8 pt-3">
        <Button
          size="lg"
          className="h-14 rounded-[16px]"
          onPress={() => router.push('/add-document')}>
          <PlusIcon size={18} weight="bold" color="#FFFFFF" />
          <Text className="text-base font-semibold">Add document</Text>
        </Button>
      </View>
    </View>
  );
}
