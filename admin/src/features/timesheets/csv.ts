import { unparse } from 'papaparse';

import { formatACST } from '@/lib/format';
import type { TimesheetRow } from './hooks';

/**
 * Payroll-ready CSV — exact column set per the phase spec:
 * worker, site, date, scheduled start/end, actual start/end, total hours (2dp), status.
 */
export function exportTimesheetsCsv(
  rows: TimesheetRow[],
  workerNames: Record<string, string>,
  siteNames: Record<string, string>,
  fromYmd: string,
  toYmd: string,
) {
  const records = rows.map((row) => {
    const totalHours =
      row.clock_out_at !== null
        ? (
            (new Date(row.clock_out_at).getTime() - new Date(row.clock_in_at).getTime()) /
            3_600_000
          ).toFixed(2)
        : '';
    return {
      worker: workerNames[row.worker_id] ?? row.worker_id,
      site: siteNames[row.site_id] ?? row.site_id,
      date: formatACST(row.shift_starts_at, 'yyyy-MM-dd'),
      'scheduled start': formatACST(row.shift_starts_at, 'h:mm a'),
      'scheduled end': formatACST(row.shift_ends_at, 'h:mm a'),
      'actual start': formatACST(row.clock_in_at, 'h:mm a'),
      'actual end': row.clock_out_at ? formatACST(row.clock_out_at, 'h:mm a') : '',
      'total hours': totalHours,
      status: row.effective_status,
    };
  });

  const csv = unparse(records, {
    columns: [
      'worker',
      'site',
      'date',
      'scheduled start',
      'scheduled end',
      'actual start',
      'actual end',
      'total hours',
      'status',
    ],
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `rosterbay-timesheets-${fromYmd}-${toYmd}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
