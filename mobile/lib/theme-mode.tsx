import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Persisted light/dark preference. NativeWind owns the live `colorScheme`; we
 * only hydrate it from storage on launch and write changes back. Kept as plain
 * hooks (no context provider wrapping the navigator) — wrapping <Stack> in an
 * extra provider that re-renders on scheme change was detaching frozen tab
 * screens from their navigation container on toggle.
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

function writeStored(mode: ThemeMode): void {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(STORAGE_KEY, mode);
    else void SecureStore.setItemAsync(STORAGE_KEY, mode);
  } catch {
    // Non-fatal — the choice simply won't persist.
  }
}

/** Apply the persisted scheme once on launch. Call once, at the app root. */
export function useHydrateThemeMode(): void {
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    let active = true;
    void readStored().then((stored) => {
      if (active && stored) setColorScheme(stored);
    });
    return () => {
      active = false;
    };
  }, [setColorScheme]);
}

export function useThemeMode() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const mode: ThemeMode = colorScheme === 'dark' ? 'dark' : 'light';
  const setMode = (next: ThemeMode) => {
    setColorScheme(next);
    writeStored(next);
  };
  return { mode, setMode, toggle: () => setMode(mode === 'dark' ? 'light' : 'dark') };
}
