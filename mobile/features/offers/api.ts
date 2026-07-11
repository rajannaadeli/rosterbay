import { supabase } from '@/lib/supabase';

export async function fetchOffers() {
  const { data, error } = await supabase
    .from('shift_offers_with_status')
    .select('*')
    .order('broadcast_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

/** Postgres unique-violation from the first-accept-wins index. */
export const OFFER_TAKEN_CODE = '23505';

export async function acceptOffer(offerId: string, companyId: string, workerId: string) {
  const { error } = await supabase.from('offer_responses').insert({
    company_id: companyId,
    offer_id: offerId,
    worker_id: workerId,
    accepted: true,
  });
  if (error) throw error;
}

export async function fetchMyNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
  if (error) throw error;
}
