import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/lib/database.types';

export async function fetchWorkers() {
  const { data, error } = await supabase.from('worker_overview').select('*').order('full_name');
  if (error) throw error;
  return data;
}

export async function fetchWorker(workerId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', workerId).single();
  if (error) throw error;
  return data;
}

export async function fetchWorkerCerts(workerId: string) {
  const { data, error } = await supabase
    .from('worker_certs_with_status')
    .select('*')
    .eq('worker_id', workerId)
    .order('expires_on');
  if (error) throw error;
  return data;
}

export async function fetchWorkerShifts(workerId: string, limit = 25) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('worker_id', workerId)
    .order('starts_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export interface UploadCertInput {
  workerId: string;
  companyId: string;
  certTypeId: string;
  issuedOn: string;
  expiresOn: string;
  file: File;
}

export async function uploadCert(input: UploadCertInput) {
  const path = `${input.workerId}/${Date.now()}-${input.file.name.replace(/[^\w.-]+/g, '_')}`;
  const { error: uploadError } = await supabase.storage.from('certificates').upload(path, input.file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(path);

  const row: TablesInsert<'worker_certs'> = {
    company_id: input.companyId,
    worker_id: input.workerId,
    cert_type_id: input.certTypeId,
    issued_on: input.issuedOn,
    expires_on: input.expiresOn,
    file_url: urlData.publicUrl,
  };
  const { data, error } = await supabase.from('worker_certs').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateAvailabilityNotes(workerId: string, notes: string | null) {
  const patch: TablesUpdate<'profiles'> = { availability_notes: notes };
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', workerId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
