import { CaretDown, CaretRight, Clock, MapPin, Question } from '@phosphor-icons/react';
import { Circle, MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';

import { StatusPill, type StatusTone } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Tables, TimeEntryFlag, TimeEntryStatus } from '@/lib/database.types';
import { LATE_THRESHOLD_MIN, MISSING_CLOCK_OUT_GRACE_H } from '@/lib/compliance';
import { formatACST } from '@/lib/format';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';
import { cn } from '@/lib/utils';
import type { TimesheetRow as Row } from '../hooks';

const STATUS_TONE: Record<TimeEntryStatus, StatusTone> = {
  pending: 'warning',
  approved: 'success',
  flagged: 'danger',
  rejected: 'danger',
};

const STATUS_LABEL: Record<TimeEntryStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  flagged: 'Flagged',
  rejected: 'Rejected',
};

const FLAG_META: Record<TimeEntryFlag, { icon: typeof Clock; label: string }> = {
  late: { icon: Clock, label: 'Late clock-in' },
  out_of_zone: { icon: MapPin, label: 'Clocked in outside the geofence' },
  missing_clock_out: { icon: Question, label: 'Missing clock-out' },
};

function varianceMinutes(row: Row): number | null {
  if (!row.clock_out_at) return null;
  const actual = new Date(row.clock_out_at).getTime() - new Date(row.clock_in_at).getTime();
  const scheduled = new Date(row.shift_ends_at).getTime() - new Date(row.shift_starts_at).getTime();
  return Math.round((actual - scheduled) / 60_000);
}

function flagExplanation(flag: TimeEntryFlag, row: Row, site: Tables<'job_sites'> | undefined): string {
  switch (flag) {
    case 'late': {
      const lateBy = Math.round(
        (new Date(row.clock_in_at).getTime() - new Date(row.shift_starts_at).getTime()) / 60_000,
      );
      return `Clocked in ${lateBy} min after the ${formatACST(row.shift_starts_at, 'h:mm a')} start (${LATE_THRESHOLD_MIN} min grace).`;
    }
    case 'out_of_zone':
      return `Clocked in ${Math.round(Number(row.distance_from_site_m ?? 0))} m from site — the geofence is ${site?.geofence_radius_m ?? '—'} m.`;
    case 'missing_clock_out':
      return `No clock-out ${MISSING_CLOCK_OUT_GRACE_H} h after the ${formatACST(row.shift_ends_at, 'h:mm a')} shift end.`;
  }
}

interface TimesheetRowProps {
  row: Row;
  workerName: string;
  site: Tables<'job_sites'> | undefined;
  expanded: boolean;
  isLive: boolean;
  busy: boolean;
  onToggle: () => void;
  onReview: (status: 'approved' | 'rejected') => void;
}

export function TimesheetRowItem({
  row,
  workerName,
  site,
  expanded,
  isLive,
  busy,
  onToggle,
  onReview,
}: TimesheetRowProps) {
  const variance = varianceMinutes(row);
  const reviewable = row.effective_status === 'pending' || row.effective_status === 'flagged';

  return (
    <li
      className={cn(
        'border-b last:border-b-0',
        isLive && 'animate-in duration-200 fade-in slide-in-from-top-2',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          aria-label={expanded ? 'Collapse entry' : 'Expand entry'}
          aria-expanded={expanded}
          onClick={onToggle}
          className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {expanded ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
        </button>

        <div className="w-40 min-w-0">
          <p className="truncate text-sm font-medium">{workerName}</p>
          <p className="truncate text-xs text-muted-foreground">{site?.name ?? '—'}</p>
        </div>

        <div className="hidden w-44 text-xs text-muted-foreground sm:block">
          <p>
            Sched {formatACST(row.shift_starts_at, 'h:mma').toLowerCase()}–
            {formatACST(row.shift_ends_at, 'h:mma').toLowerCase()}
          </p>
          <p>
            Actual {formatACST(row.clock_in_at, 'h:mma').toLowerCase()}–
            {row.clock_out_at ? formatACST(row.clock_out_at, 'h:mma').toLowerCase() : '…'}
          </p>
        </div>

        <span
          className={cn(
            'w-14 text-right text-xs font-medium tabular-nums',
            variance === null
              ? 'text-muted-foreground'
              : Math.abs(variance) > 30
                ? 'text-warning'
                : 'text-muted-foreground',
          )}
        >
          {variance === null ? '—' : `${variance >= 0 ? '+' : '−'}${Math.abs(variance)}m`}
        </span>

        <span className="flex w-16 items-center gap-1.5">
          {row.effective_flags.map((flag) => {
            const meta = FLAG_META[flag];
            return (
              <Tooltip key={flag}>
                <TooltipTrigger
                  render={<span className="inline-flex" aria-label={meta.label} />}
                >
                  <meta.icon size={14} weight="duotone" className="text-danger" aria-hidden />
                </TooltipTrigger>
                <TooltipContent>{meta.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </span>

        <StatusPill
          tone={STATUS_TONE[row.effective_status]}
          label={STATUS_LABEL[row.effective_status]}
          className="w-fit"
        />

        <div className="ml-auto flex items-center gap-1.5">
          {reviewable && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onReview('approved')}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:text-danger"
                disabled={busy}
                onClick={() => onReview('rejected')}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 border-t bg-muted/20 px-11 py-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            {site && row.in_lat !== null && row.in_lng !== null ? (
              <>
                <div className="h-52 overflow-hidden rounded-lg border">
                  <MapContainer
                    center={[site.lat, site.lng]}
                    zoom={15}
                    className="h-full w-full"
                    scrollWheelZoom={false}
                  >
                    <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                    <Circle
                      center={[site.lat, site.lng]}
                      radius={site.geofence_radius_m}
                      pathOptions={{ color: '#0F766E', fillColor: '#0F766E', fillOpacity: 0.12, weight: 2 }}
                    />
                    <Marker position={[row.in_lat, row.in_lng]} />
                    <Polyline
                      positions={[
                        [site.lat, site.lng],
                        [row.in_lat, row.in_lng],
                      ]}
                      pathOptions={{ color: '#DC2626', dashArray: '6 6', weight: 2 }}
                    />
                  </MapContainer>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clocked in{' '}
                  <span
                    className={cn(
                      'font-medium',
                      row.within_geofence === false ? 'text-danger' : 'text-foreground',
                    )}
                  >
                    {Math.round(Number(row.distance_from_site_m ?? 0))} m from site
                  </span>{' '}
                  — geofence {site.geofence_radius_m} m.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No clock-in location recorded.</p>
            )}
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-card px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Clock-in</p>
                <p className="font-medium tabular-nums">
                  {formatACST(row.clock_in_at, 'h:mm:ss a')}
                </p>
              </div>
              <div className="rounded-lg border bg-card px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Clock-out</p>
                <p className="font-medium tabular-nums">
                  {row.clock_out_at ? formatACST(row.clock_out_at, 'h:mm:ss a') : 'Not yet'}
                </p>
              </div>
            </div>
            {row.effective_flags.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {row.effective_flags.map((flag) => (
                  <li
                    key={flag}
                    className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-danger"
                  >
                    {flagExplanation(flag, row, site)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Clean entry — clocked in on time, inside the geofence.
              </p>
            )}
            {row.reviewed_at && (
              <p className="text-xs text-muted-foreground">
                Reviewed {formatACST(row.reviewed_at, 'd MMM, h:mm a')}
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
