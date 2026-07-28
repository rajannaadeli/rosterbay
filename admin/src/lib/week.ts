import { TZDate } from '@date-fns/tz';
import { addDays, addWeeks, startOfWeek } from 'date-fns';

import { ACST } from './format';

/** Monday 00:00 in Australia/Adelaide for the week `offset` weeks from now. */
export function acstWeekStart(offsetWeeks = 0): TZDate {
  const nowAcst = new TZDate(Date.now(), ACST);
  return addWeeks(startOfWeek(nowAcst, { weekStartsOn: 1 }), offsetWeeks);
}

/** The seven ACST days of the week starting at `weekStart`. */
export function weekDays(weekStart: TZDate): TZDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** [fromIso, toIso) UTC bounds for a week query. */
export function weekBounds(weekStart: TZDate): { fromIso: string; toIso: string } {
  return {
    fromIso: weekStart.toISOString(),
    toIso: addDays(weekStart, 7).toISOString(),
  };
}

/**
 * Builds a UTC ISO timestamp from an ACST calendar date + HH:mm.
 *
 * Constructed from numeric components via `TZDate.tz`, never from a string.
 * `new TZDate('2026-07-29T00:00:00', ACST)` parses the bare string in the
 * *system* timezone and only then re-expresses it in ACST — so on a browser
 * anywhere but Adelaide it silently produced a timestamp offset by the
 * difference between the two zones (four hours from UTC+5:30, nine and a half
 * from UTC). Seeded data hid it because the seed writes timestamps in SQL;
 * only shifts created or retimed through the UI were wrong.
 */
export function acstTimestamp(dateYmd: string, timeHm: string): string {
  const [year, month, day] = dateYmd.split('-').map(Number) as [number, number, number];
  const [hours, minutes] = timeHm.split(':').map(Number) as [number, number];
  return TZDate.tz(ACST, year, month - 1, day, hours, minutes, 0).toISOString();
}

/** 00:00 ACST on `dateYmd`, as a real instant. */
export function acstMidnight(dateYmd: string): Date {
  return new Date(acstTimestamp(dateYmd, '00:00'));
}
