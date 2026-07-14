import { CheckCircleIcon, EyeIcon, MegaphoneIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  useAcceptOffer,
  useOffers,
  useOffersRealtime,
  useOthersViewing,
} from '@/features/offers/hooks';
import { useSites } from '@/features/schedule/hooks';
import { useColors } from '@/lib/colors';
import type { Views } from '@/lib/database.types';
import { formatACST, formatShiftRange } from '@/lib/format';

type OfferRow = Views<'shift_offers_with_status'>;

export default function OffersScreen() {
  const offers = useOffers();
  const sites = useSites();
  const accept = useAcceptOffer();
  const othersViewing = useOthersViewing();
  const c = useColors();
  useOffersRealtime();

  const [wonOfferId, setWonOfferId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const siteNames = new Map((sites.data ?? []).map((s) => [s.id, s.name]));
  const visible = (offers.data ?? []).filter((o) => o.effective_status !== 'expired');

  if (offers.isPending || sites.isPending) {
    return (
      <View className="flex-1 gap-3 bg-background p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-[18px]" />
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={visible}
        keyExtractor={(offer) => offer.id}
        contentContainerClassName="gap-3 p-4 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([offers.refetch(), sites.refetch()]);
              setRefreshing(false);
            }}
            tintColor={c.mutedForeground}
          />
        }
        ListHeaderComponent={
          othersViewing > 0 ? (
            <View className="flex-row items-center gap-1.5 pb-1">
              <EyeIcon size={13} color={c.mutedForeground} />
              <Text className="text-xs text-muted-foreground">
                {othersViewing} other{othersViewing === 1 ? '' : 's'} viewing offers right now
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            className="py-24"
            icon={MegaphoneIcon}
            title="No open offers"
            body="When Torrens broadcasts a shift you're eligible for, it lands here instantly — first to accept gets it."
          />
        }
        renderItem={({ item: offer }) => (
          <OfferCard
            offer={offer}
            siteName={siteNames.get(offer.site_id) ?? 'Job site'}
            won={wonOfferId === offer.id}
            busy={accept.isPending}
            onAccept={() =>
              accept.mutate(
                { offerId: offer.id, companyId: offer.company_id },
                {
                  onSuccess: (outcome) => {
                    if (outcome === 'won') setWonOfferId(offer.id);
                  },
                }
              )
            }
          />
        )}
      />
    </View>
  );
}

interface OfferCardProps {
  offer: OfferRow;
  siteName: string;
  won: boolean;
  busy: boolean;
  onAccept: () => void;
}

function OfferCard({ offer, siteName, won, busy, onAccept }: OfferCardProps) {
  const c = useColors();
  const filled = offer.effective_status === 'filled';

  return (
    <View
      className={`gap-3 rounded-[18px] bg-card p-4 shadow-sm ${filled && !won ? 'opacity-70' : ''}`}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-semibold uppercase tracking-widest text-primary">
            Shift offer
          </Text>
          <Text className="text-lg font-bold tracking-tight">{siteName}</Text>
          <Text className="text-sm tabular-nums text-muted-foreground">
            {formatACST(offer.shift_starts_at, 'EEE d MMM')} ·{' '}
            {formatShiftRange(offer.shift_starts_at, offer.shift_ends_at)}
            {offer.role_required ? ` · ${offer.role_required}` : ''}
          </Text>
        </View>
        {filled && <StatusPill tone="success" label="Filled" showIcon={false} />}
      </View>

      {won ? (
        <View className="flex-row items-center gap-2 rounded-[12px] bg-success/10 px-3 py-2.5">
          <CheckCircleIcon size={18} weight="fill" color={c.success} />
          <Text className="flex-1 text-sm font-medium text-success">
            You got it — the shift is in your Schedule.
          </Text>
        </View>
      ) : filled ? (
        <Text className="text-sm text-muted-foreground">
          This one's gone — another worker accepted first.
        </Text>
      ) : (
        <Button size="lg" disabled={busy} onPress={onAccept}>
          <Text className="font-semibold">{busy ? 'Accepting…' : 'Accept Shift'}</Text>
        </Button>
      )}
    </View>
  );
}
