import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env');
}

// SecureStore soft-limits values to 2048 bytes; a Supabase session is bigger.
// Values are split into numbered chunks with a count entry at the base key.
const CHUNK_SIZE = 1900;

const chunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const head = await SecureStore.getItemAsync(key);
    if (head === null) return null;
    const count = Number.parseInt(head, 10);
    if (!Number.isFinite(count)) return head; // legacy unchunked value
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
    );
    if (chunks.some((c) => c === null)) return null;
    return chunks.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const count = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(key, String(count));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
  },
  async removeItem(key: string): Promise<void> {
    const head = await SecureStore.getItemAsync(key);
    const count = head === null ? 0 : Number.parseInt(head, 10);
    await SecureStore.deleteItemAsync(key);
    if (Number.isFinite(count)) {
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
    }
  },
};

/** The one Supabase client for the worker app — never instantiate another. */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: chunkedSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
