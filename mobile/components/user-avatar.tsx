import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * The one avatar for every mobile surface — deterministic initials on a muted,
 * name-hashed background. Mirrors the web UserAvatar palette/sizing exactly.
 */

const TONES: { bg: string; fg: string }[] = [
  { bg: '#E2E8F0', fg: '#475569' },
  { bg: '#DDE3EA', fg: '#54606E' },
  { bg: '#D2E4E1', fg: '#2F6E68' },
  { bg: '#EBE2D3', fg: '#7C6A48' },
  { bg: '#E9DBD3', fg: '#7E5A48' },
  { bg: '#E7DEE7', fg: '#6E5B70' },
  { bg: '#DAE1EC', fg: '#4C5B72' },
  { bg: '#E6E1DB', fg: '#6B6157' },
];

const SIZES = {
  xs: { box: 20, text: 'text-[9px]' },
  sm: { box: 28, text: 'text-[10px]' },
  md: { box: 40, text: 'text-sm' },
  lg: { box: 56, text: 'text-lg' },
} as const;

export type AvatarSize = keyof typeof SIZES;

function toneFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % TONES.length;
  return TONES[hash]!;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return '?';
  const first = parts[0]![0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : '';
  return (first + last).toUpperCase();
}

interface UserAvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

export function UserAvatar({ name, size = 'sm', className }: UserAvatarProps) {
  const tone = toneFor(name);
  const { box, text } = SIZES[size];
  return (
    <View
      style={{ width: box, height: box, backgroundColor: tone.bg }}
      className={cn('items-center justify-center rounded-full', className)}
    >
      <Text style={{ color: tone.fg }} className={cn('font-semibold', text)}>
        {userInitials(name)}
      </Text>
    </View>
  );
}
