import { cn } from '@/lib/utils';

/**
 * The one avatar for every surface: deterministic initials on a muted,
 * name-hashed background. No image pipeline, no doodles. The 8 tones are
 * desaturated slate/teal/sand/clay/mauve/denim/taupe — never the semantic
 * green/amber/red, which stay reserved for status.
 */

const TONES: { bg: string; fg: string }[] = [
  { bg: '#E2E8F0', fg: '#475569' }, // slate
  { bg: '#DDE3EA', fg: '#54606E' }, // steel
  { bg: '#D2E4E1', fg: '#2F6E68' }, // teal (muted)
  { bg: '#EBE2D3', fg: '#7C6A48' }, // sand
  { bg: '#E9DBD3', fg: '#7E5A48' }, // clay
  { bg: '#E7DEE7', fg: '#6E5B70' }, // mauve
  { bg: '#DAE1EC', fg: '#4C5B72' }, // denim
  { bg: '#E6E1DB', fg: '#6B6157' }, // taupe
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
    <span
      aria-hidden
      style={{ width: box, height: box, backgroundColor: tone.bg, color: tone.fg }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-black/5 select-none',
        text,
        className,
      )}
    >
      {userInitials(name)}
    </span>
  );
}
