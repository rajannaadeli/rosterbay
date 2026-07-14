import { router } from 'expo-router';
import { CertificateIcon, FileTextIcon, PlusIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { CertPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCertTypes, useMyCerts } from '@/features/wallet/hooks';
import { useColors } from '@/lib/colors';
import type { Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';

function expiryLine(cert: Views<'worker_certs_with_status'>): string {
  if (cert.status === 'expired') {
    const days = Math.abs(cert.days_until_expiry);
    return `Expired ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}`;
  }
  if (cert.status === 'expiring_soon') {
    return `Expires in ${cert.days_until_expiry} day${cert.days_until_expiry === 1 ? '' : 's'}`;
  }
  return `Expires ${formatACST(cert.expires_on, 'd MMM yyyy')}`;
}

const EXPIRY_TEXT_CLASS = {
  valid: 'text-muted-foreground',
  expiring_soon: 'font-medium text-warning',
  expired: 'font-medium text-danger',
} as const;

export default function WalletScreen() {
  const certs = useMyCerts();
  const certTypes = useCertTypes();
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);

  const typeById = new Map((certTypes.data ?? []).map((certType) => [certType.id, certType]));
  const isPending = certs.isPending || certTypes.isPending;

  return (
    <View className="flex-1 bg-background">
      {isPending ? (
        <View className="gap-3 p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-[16px]" />
          ))}
        </View>
      ) : (
        <FlatList
          data={certs.data ?? []}
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
          ListHeaderComponent={
            <Text className="pb-1 text-sm text-muted-foreground">
              Your certificates and licences — carried with you, not locked in an office drawer.
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center gap-3 rounded-[18px] border border-dashed border-border px-6 py-14">
              <View className="rounded-full bg-muted p-4">
                <CertificateIcon size={26} weight="duotone" color={c.mutedForeground} />
              </View>
              <Text className="text-sm font-medium">No documents yet</Text>
              <Text className="text-center text-sm text-muted-foreground">
                Add your first certificate — a photo from your camera roll is all it takes.
              </Text>
            </View>
          }
          renderItem={({ item: cert }) => {
            const certType = typeById.get(cert.cert_type_id);
            return (
              <Card className={cert.status === 'expired' ? 'border-l-4 border-l-danger' : ''}>
                <CardContent className="gap-2 p-4">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="text-base font-medium">
                        {certType?.name ?? 'Certificate'}
                      </Text>
                      <Text className="text-xs text-muted-foreground">{certType?.code}</Text>
                    </View>
                    <CertPill status={cert.status} />
                  </View>
                  <Text className={`text-sm ${EXPIRY_TEXT_CLASS[cert.status]}`}>
                    {expiryLine(cert)}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <FileTextIcon size={14} color={c.mutedForeground} />
                    <Text className="text-xs text-muted-foreground">
                      {cert.file_url ? 'Document attached' : 'No file attached'} · Issued{' '}
                      {formatACST(cert.issued_on, 'd MMM yyyy')}
                    </Text>
                  </View>
                </CardContent>
              </Card>
            );
          }}
        />
      )}

      {/* Primary action pinned to the thumb zone. */}
      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-card px-4 pb-8 pt-3">
        <Button size="lg" className="h-14 rounded-[16px]" onPress={() => router.push('/add-document')}>
          <PlusIcon size={18} color="#FFFFFF" />
          <Text className="text-base font-semibold">Add document</Text>
        </Button>
      </View>
    </View>
  );
}
