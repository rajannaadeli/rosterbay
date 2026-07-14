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

/**
 * Compact shift-range for chips/dense cells — never truncates or wraps.
 * Drops `:00` minutes; collapses a shared meridiem: 6am–2pm · 2–10pm · 10pm–6am.
 */
export function formatShiftRange(startsAt: string | Date, endsAt: string | Date): string {
  const start = partsACST(startsAt);
  const end = partsACST(endsAt);
  const startStr = `${start.time}${start.meridiem === end.meridiem ? '' : start.meridiem}`;
  return `${startStr}–${end.time}${end.meridiem}`;
}

function partsACST(date: string | Date): { time: string; meridiem: 'am' | 'pm' } {
  const h24 = Number(formatACST(date, 'H'));
  const min = formatACST(date, 'mm');
  const hour12 = formatACST(date, 'h');
  return { time: min === '00' ? hour12 : `${hour12}:${min}`, meridiem: h24 < 12 ? 'am' : 'pm' };
}
