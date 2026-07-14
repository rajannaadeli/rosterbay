import { Clock, MapPin, Question } from '@phosphor-icons/react';
import { Circle, MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';

import { FullscreenInvalidate, FullscreenMapWrapper } from '@/components/fullscreen-map-wrapper';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LATE_THRESHOLD_MIN, MISSING_CLOCK_OUT_GRACE_H } from '@/lib/compliance';
import type { Tables, TimeEntryFlag } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';
import { clockInDotIcon, FitBounds, GEOFENCE_PATH_OPTIONS, siteIcon } from '@/lib/map-markers';
import type { TimesheetRow } from '../hooks';

const FLAG_ICON: Record<TimeEntryFlag, typeof Clock> = {
  late: Clock,
  out_of_zone: MapPin,
  missing_clock_out: Question,
};

function flagExplanation(flag: TimeEntryFlag, row: TimesheetRow, site?: Tables<'job_sites'>): string {
  switch (flag) {
    case 'late': {
      const lateBy = Math.round(
        (new Date(row.clock_in_at).getTime() - new Date(row.shift_starts_at).getTime()) / 60_000,
      );
      return `Clocked in ${lateBy} min after the ${formatACST(row.shift_starts_at, 'h:mm a')} start — ${LATE_THRESHOLD_MIN} min grace.`;
    }
    case 'out_of_zone':
      return `Clocked in ${Math.round(Number(row.distance_from_site_m ?? 0))} m from site — the geofence is ${site?.geofence_radius_m ?? '—'} m.`;
    case 'missing_clock_out':
      return `No clock-out ${MISSING_CLOCK_OUT_GRACE_H} h after the ${formatACST(row.shift_ends_at, 'h:mm a')} shift end.`;
  }
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

interface ReviewPanelProps {
  row: TimesheetRow;
  site: Tables<'job_sites'> | undefined;
  busy: boolean;
  onReview: (status: 'approved' | 'rejected') => void;
}

export function ReviewPanel({ row, site, busy, onReview }: ReviewPanelProps) {
  const hasPoint = site && row.in_lat !== null && row.in_lng !== null;
  const totalHours =
    row.clock_out_at !== null
      ? (
          (new Date(row.clock_out_at).getTime() - new Date(row.clock_in_at).getTime()) /
          3_600_000
        ).toFixed(2) + ' h'
      : '—';
  const reviewable = row.effective_status === 'pending' || row.effective_status === 'flagged';

  return (
    <div className="grid grid-cols-1 gap-4 border-t bg-muted/20 p-4 lg:grid-cols-2">
      <div className="relative">
        {hasPoint ? (
          <>
            <FullscreenMapWrapper className="h-[260px] overflow-hidden rounded-lg border">
              <MapContainer
                center={[site.lat, site.lng]}
                zoom={15}
                className="z-0 h-full w-full"
                scrollWheelZoom={true}
              >
                <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                <FullscreenInvalidate />
                <FitBounds
                  points={[
                    [site.lat, site.lng],
                    [row.in_lat as number, row.in_lng as number],
                  ]}
                  maxZoom={16}
                />
                <Circle center={[site.lat, site.lng]} radius={site.geofence_radius_m} pathOptions={GEOFENCE_PATH_OPTIONS} />
                <Marker position={[site.lat, site.lng]} icon={siteIcon(site.name)} />
                <Marker position={[row.in_lat as number, row.in_lng as number]} icon={clockInDotIcon} />
                <Polyline
                  positions={[
                    [site.lat, site.lng],
                    [row.in_lat as number, row.in_lng as number],
                  ]}
                  pathOptions={{ color: '#DC2626', dashArray: '6 6', weight: 2 }}
                />
              </MapContainer>
              <span
                style={{ zIndex: 999 }}
                className="absolute bottom-3 left-3 rounded-lg border bg-card/90 px-2 py-1 text-[11px] font-medium shadow-sm backdrop-blur"
              >
                <span className={row.within_geofence === false ? 'text-danger' : 'text-foreground'}>
                  {Math.round(Number(row.distance_from_site_m ?? 0))} m from site
                </span>
              </span>
            </FullscreenMapWrapper>
          </>
        ) : (
          <div className="flex h-[260px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
            No clock-in location recorded.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <StatCell label="Clock-in" value={formatACST(row.clock_in_at, 'h:mm a')} />
          <StatCell
            label="Clock-out"
            value={row.clock_out_at ? formatACST(row.clock_out_at, 'h:mm a') : 'Not yet'}
          />
          <StatCell
            label="Scheduled"
            value={`${formatACST(row.shift_starts_at, 'h:mma').toLowerCase()}–${formatACST(row.shift_ends_at, 'h:mma').toLowerCase()}`}
          />
          <StatCell label="Total hrs" value={totalHours} />
        </div>

        {row.effective_flags.length > 0 ? (
          <div className="flex flex-col gap-2">
            {row.effective_flags.map((flag) => {
              const FlagIcon = FLAG_ICON[flag];
              return (
                <Alert key={flag} variant="destructive">
                  <FlagIcon aria-hidden />
                  <AlertTitle className="capitalize">{flag.replace(/_/g, ' ')}</AlertTitle>
                  <AlertDescription>{flagExplanation(flag, row, site)}</AlertDescription>
                </Alert>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Clean entry — clocked in on time, inside the geofence.
          </p>
        )}

        <div className="mt-auto flex items-center justify-end gap-2">
          {row.reviewed_at && (
            <span className="mr-auto text-xs text-muted-foreground">
              Reviewed {formatACST(row.reviewed_at, 'd MMM, h:mm a')}
            </span>
          )}
          {reviewable && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:text-danger"
                disabled={busy}
                onClick={() => onReview('rejected')}
              >
                Reject
              </Button>
              <Button size="sm" disabled={busy} onClick={() => onReview('approved')}>
                Approve
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
