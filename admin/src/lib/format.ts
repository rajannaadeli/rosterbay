import { format } from 'date-fns';
import { tz } from '@date-fns/tz';

export const ACST = 'Australia/Adelaide';

/**
 * The single display formatter — all timestamps are stored UTC and rendered
 * in Australia/Adelaide (ACST, UTC+9:30). Never format dates elsewhere.
 */
export function formatACST(date: string | Date, fmt = 'd MMM yyyy, h:mm a'): string {
  return format(date, fmt, { in: tz(ACST) });
}

/** "Liam Nguyen" → "LN" for avatar fallbacks. */
export function initials(fullName: string): string {
  return fullName
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
