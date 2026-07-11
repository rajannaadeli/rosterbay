import { CheckCircleIcon, EyeIcon, MegaphoneIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  useAcceptOffer,
  useOffers,
  useOffersRealtime,
  useOthersViewing,
} from '@/features/offers/hooks';
import { useSites } from '@/features/schedule/hooks';
import type { Views } from '@/lib/database.types';
import { formatACST } from '@/lib/format';

type OfferRow = Views<'shift_offers_with_status'>;

export default function OffersScreen() {
  const offers = useOffers();
  const sites = useSites();
  const accept = useAcceptOffer();
  const othersViewing = useOthersViewing();
  useOffersRealtime();

  const [wonOfferId, setWonOfferId] = useState<string | null>(null);

  const siteNames = new Map((sites.data ?? []).map((s) => [s.id, s.name]));
  const visible = (offers.data ?? []).filter((o) => o.effective_status !== 'expired');

  if (offers.isPending || sites.isPending) {
    return (
      <View className="flex-1 gap-3 bg-background p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
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
        ListHeaderComponent={
          othersViewing > 0 ? (
            <View className="flex-row items-center gap-1.5 pb-1">
              <EyeIcon size={13} color="#78716C" />
              <Text className="text-xs text-muted-foreground">
                {othersViewing} other{othersViewing === 1 ? '' : 's'} viewing offers right now
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14">
            <View className="rounded-lg bg-muted p-3">
              <MegaphoneIcon size={26} weight="duotone" color="#78716C" />
            </View>
            <Text className="text-sm font-medium">No open offers</Text>
            <Text className="text-center text-sm text-muted-foreground">
              When Torrens broadcasts a shift you're eligible for, it lands here instantly — first
              to accept gets it.
            </Text>
          </View>
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
  const filled = offer.effective_status === 'filled';

  return (
    <Card className={filled && !won ? 'opacity-70' : ''}>
      <CardContent className="gap-3 p-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-xs font-medium uppercase tracking-wider text-primary">
              Shift offer
            </Text>
            <Text className="text-lg font-semibold">{siteName}</Text>
            <Text className="text-sm tabular-nums text-muted-foreground">
              {formatACST(offer.shift_starts_at, 'EEE d MMM · h:mma').toLowerCase()}–
              {formatACST(offer.shift_ends_at, 'h:mma').toLowerCase()}
              {offer.role_required ? ` · ${offer.role_required}` : ''}
            </Text>
          </View>
          {filled && <StatusPill tone="success" label="Filled" showIcon={false} />}
        </View>

        {won ? (
          <View className="flex-row items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
            <CheckCircleIcon size={18} weight="duotone" color="#16A34A" />
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
      </CardContent>
    </Card>
  );
}
