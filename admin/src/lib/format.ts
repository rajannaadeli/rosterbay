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

/**
 * Compact shift-range for chips and dense cells — never truncates or wraps.
 * Drops `:00` minutes; collapses a shared meridiem:
 *   6am–2pm · 2–10pm · 10pm–6am · 1–9am · 6:30am–2:15pm
 * Full times (formatACST) stay for popovers/drawers/expanded panels.
 */
export function formatShiftRange(startsAt: string | Date, endsAt: string | Date): string {
  const start = partsACST(startsAt);
  const end = partsACST(endsAt);
  const shareMeridiem = start.meridiem === end.meridiem;
  const startStr = `${start.time}${shareMeridiem ? '' : start.meridiem}`;
  const endStr = `${end.time}${end.meridiem}`;
  return `${startStr}–${endStr}`;
}

function partsACST(date: string | Date): { time: string; meridiem: 'am' | 'pm' } {
  const h24 = Number(formatACST(date, 'H'));
  const min = formatACST(date, 'mm');
  const hour12 = formatACST(date, 'h');
  const time = min === '00' ? hour12 : `${hour12}:${min}`;
  return { time, meridiem: h24 < 12 ? 'am' : 'pm' };
}
