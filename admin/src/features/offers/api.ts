import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';

export async function fetchOpenOffers() {
  const { data, error } = await supabase
    .from('shift_offers_with_status')
    .select('*')
    .eq('effective_status', 'open');
  if (error) throw error;
  return data;
}

export interface BroadcastInput {
  shift: Tables<'shifts'>;
  siteName: string;
  /** Pre-computed with the conflict engine — one notification each. */
  eligibleWorkerIds: string[];
}

export async function broadcastOffer({ shift, siteName, eligibleWorkerIds }: BroadcastInput) {
  const { data: offer, error } = await supabase
    .from('shift_offers')
    .insert({ company_id: shift.company_id, shift_id: shift.id })
    .select()
    .single();
  if (error) throw error;

  if (eligibleWorkerIds.length > 0) {
    const when = new Date(shift.starts_at).toLocaleString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Australia/Adelaide',
    });
    const { error: notifyError } = await supabase.from('notifications').insert(
      eligibleWorkerIds.map((workerId) => ({
        company_id: shift.company_id,
        user_id: workerId,
        kind: 'offer',
        title: 'New shift offer',
        body: `${siteName} — ${when}. First to accept gets it.`,
        ref_id: offer.id,
      })),
    );
    if (notifyError) throw notifyError;
  }

  return offer;
}
