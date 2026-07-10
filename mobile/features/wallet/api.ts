import { supabase } from '@/lib/supabase';

export async function fetchMyProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function fetchMyCerts(userId: string) {
  const { data, error } = await supabase
    .from('worker_certs_with_status')
    .select('*')
    .eq('worker_id', userId)
    .order('expires_on');
  if (error) throw error;
  return data;
}

export async function fetchCertTypes() {
  const { data, error } = await supabase.from('cert_types').select('*').order('name');
  if (error) throw error;
  return data;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface AddCertInput {
  workerId: string;
  companyId: string;
  certTypeId: string;
  issuedOn: string;
  expiresOn: string;
  /** base64 payload from expo-image-picker (no data: prefix). */
  imageBase64: string;
  mimeType: string;
}

export async function addCert(input: AddCertInput) {
  const extension = input.mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${input.workerId}/${Date.now()}.${extension}`;
  const bytes = base64ToBytes(input.imageBase64);

  const { error: uploadError } = await supabase.storage
    .from('certificates')
    .upload(path, bytes.buffer as ArrayBuffer, { contentType: input.mimeType });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(path);

  const { data, error } = await supabase
    .from('worker_certs')
    .insert({
      company_id: input.companyId,
      worker_id: input.workerId,
      cert_type_id: input.certTypeId,
      issued_on: input.issuedOn,
      expires_on: input.expiresOn,
      file_url: urlData.publicUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
