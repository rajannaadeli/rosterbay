import { useColorScheme } from 'nativewind';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Persisted light/dark preference. NativeWind owns the live `colorScheme`; this
 * provider hydrates it from storage on launch and writes changes back, so the
 * choice survives a restart. Web falls back to localStorage (SecureStore is
 * native-only) and is a no-op in the static-export pass.
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

interface ThemeModeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the stored preference once, before first paint of the shell.
  useEffect(() => {
    let active = true;
    void readStored().then((stored) => {
      if (active && stored) setColorScheme(stored);
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [setColorScheme]);

  const mode: ThemeMode = colorScheme === 'dark' ? 'dark' : 'light';

  const setMode = (next: ThemeMode) => {
    setColorScheme(next);
    writeStored(next);
  };

  const value: ThemeModeValue = {
    mode,
    setMode,
    toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
  };

  // Avoid a flash of the wrong theme: hold paint until the pref is resolved.
  if (!hydrated) return null;

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeValue {
  const context = useContext(ThemeModeContext);
  if (!context) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return context;
}
