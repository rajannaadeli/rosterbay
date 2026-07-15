import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DevSettings, Platform } from 'react-native';

/**
 * Persisted light/dark preference.
 *
 * NativeWind's `setColorScheme` force-re-renders the whole tree, which under
 * expo-router detaches live screens from their navigation container and crashes
 * ("Couldn't find a navigation context"). So we never flip the scheme in a live
 * session: `setMode` persists the choice and reloads the JS, and
 * `useHydrateThemeMode` applies the stored scheme once during the fresh mount
 * (safe, because nothing has settled/detached yet).
 */

const STORAGE_KEY = 'rosterbay.theme-mode';
export type ThemeMode = 'light' | 'dark';

async function readStored(): Promise<ThemeMode | null> {
  try {
    const value =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(STORAGE_KEY)
        : await SecureStore.getItemAsync(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

async function writeStored(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(STORAGE_KEY, mode);
    else await SecureStore.setItemAsync(STORAGE_KEY, mode);
  } catch {
    // Non-fatal — the choice simply won't persist.
  }
}

/** Reload the JS bundle so the navigator rebuilds cleanly into the new scheme. */
function reloadApp(): void {
  if (Platform.OS === 'web') {
    globalThis.location?.reload();
    return;
  }
  // Dev / Expo Go: a JS reload. In a release build this is a no-op, so the
  // preference just applies on the next natural launch instead.
  DevSettings.reload?.();
}

/**
 * Read + apply the persisted scheme once on launch, and report when done.
 * Callers must hold the navigator OUT of the tree until this returns true, so
 * the applying `setColorScheme` runs before any screen mounts (a scheme flip
 * after the navigator has mounted is the crash we're avoiding).
 */
export function useHydrateThemeMode(): boolean {
  const { setColorScheme } = useColorScheme();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void readStored().then((stored) => {
      if (!active) return;
      if (stored) setColorScheme(stored);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [setColorScheme]);
  return ready;
}

export function useThemeMode() {
  const { colorScheme } = useColorScheme();
  const mode: ThemeMode = colorScheme === 'dark' ? 'dark' : 'light';

  // Persist first (awaited so the write survives), then reload — the fresh
  // mount picks up the stored scheme. Never `setColorScheme` while live.
  const setMode = (next: ThemeMode) => {
    if (next === mode) return;
    void writeStored(next).then(reloadApp);
  };

  return { mode, setMode, toggle: () => setMode(mode === 'dark' ? 'light' : 'dark') };
}
