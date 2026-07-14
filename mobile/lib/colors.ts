import { useColorScheme } from 'nativewind';

/**
 * Hex mirror of the token set for the places className can't reach — chiefly
 * Phosphor icon `color=` props and react-native-svg strokes. Keep in lockstep
 * with global.css: light is the canonical spec §6 palette; dark is the warm
 * inversion, with the teal accent and semantic status hues lifted just enough
 * to stay legible on near-black. Status hues keep their meaning in both modes.
 */

export interface Palette {
  background: string;
  card: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  muted: string;
  primary: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
  /** Faint icon/placeholder tint (inactive tab, chevrons). */
  faint: string;
}

export const LIGHT: Palette = {
  background: '#FAFAF9',
  card: '#FFFFFF',
  foreground: '#1C1917',
  mutedForeground: '#78716C',
  border: '#E7E5E4',
  muted: '#F5F5F4',
  primary: '#0F766E',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  faint: '#A8A29E',
};

export const DARK: Palette = {
  background: '#141110',
  card: '#1F1B18',
  foreground: '#EAE7E2',
  mutedForeground: '#A29A92',
  border: '#38322C',
  muted: '#2A2521',
  primary: '#2DC2B2',
  onPrimary: '#0C1413',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  faint: '#6B635C',
};

export function useColors(): Palette {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? DARK : LIGHT;
}
