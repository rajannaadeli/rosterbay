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

/** Builds a UTC ISO timestamp from an ACST calendar date + HH:mm. */
export function acstTimestamp(dateYmd: string, timeHm: string): string {
  return new TZDate(`${dateYmd}T${timeHm}:00`, ACST).toISOString();
}
