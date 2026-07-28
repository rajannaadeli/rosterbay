import { cn } from '@/lib/utils';

/**
 * The one avatar for every surface: deterministic initials on a muted,
 * name-hashed background. No image pipeline, no doodles.
 *
 * The eight tones live in index.css as `--avatar-N-bg/fg` with a designed
 * value per theme — they used to be light-only hexes here, which meant every
 * avatar in the app stayed a pale chip on near-black. They encode identity,
 * never status, so the semantic green/amber/red are not among them.
 */

const TONE_COUNT = 8;

const SIZES = {
  xs: { box: 20, text: 'text-[10px]' },
  sm: { box: 28, text: 'text-micro tracking-normal' },
  md: { box: 40, text: 'text-body' },
  lg: { box: 56, text: 'text-h2' },
} as const;

export type AvatarSize = keyof typeof SIZES;

function toneFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % TONE_COUNT;
  return hash + 1;
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
      style={{
        width: box,
        height: box,
        backgroundColor: `var(--avatar-${tone}-bg)`,
        color: `var(--avatar-${tone}-fg)`,
      }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-border-subtle select-none',
        text,
        className,
      )}
    >
      {userInitials(name)}
    </span>
  );
}
