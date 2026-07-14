import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';

/**
 * RosterBay tokens (spec §6) for react-navigation chrome. The dark entry is a
 * warm-Stone inversion mirroring global.css `.dark:root`.
 */
export const THEME = {
  light: {
    background: 'hsl(60 9% 98%)', // surface #FAFAF9
    foreground: 'hsl(24 10% 10%)', // ink #1C1917
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(24 10% 10%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(24 10% 10%)',
    primary: 'hsl(175 77% 26%)', // teal #0F766E
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(60 5% 96%)',
    secondaryForeground: 'hsl(24 10% 10%)',
    muted: 'hsl(60 5% 96%)',
    mutedForeground: 'hsl(25 5% 45%)', // ink-muted #78716C
    accent: 'hsl(60 5% 96%)',
    accentForeground: 'hsl(24 10% 10%)',
    destructive: 'hsl(0 72% 51%)', // #DC2626
    border: 'hsl(20 6% 90%)', // #E7E5E4
    input: 'hsl(20 6% 90%)',
    ring: 'hsl(175 77% 26%)',
    radius: '10px',
    chart1: 'hsl(175 77% 26%)',
    chart2: 'hsl(142 71% 36%)',
    chart3: 'hsl(32 93% 44%)',
    chart4: 'hsl(0 72% 51%)',
    chart5: 'hsl(25 5% 45%)',
  },
  dark: {
    background: 'hsl(24 11% 7%)',
    foreground: 'hsl(40 12% 92%)',
    card: 'hsl(24 8% 11%)',
    primary: 'hsl(173 58% 45%)',
    border: 'hsl(30 5% 20%)',
    destructive: 'hsl(0 72% 58%)',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
