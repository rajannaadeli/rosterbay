import { supabase } from '@/lib/supabase';

export async function fetchCompany() {
  const { data, error } = await supabase.from('companies').select('*').single();
  if (error) throw error;
  return data;
}
