import { supabase } from '@/lib/supabase';

export async function fetchCertTypes() {
  const { data, error } = await supabase.from('cert_types').select('*').order('name');
  if (error) throw error;
  return data;
}
