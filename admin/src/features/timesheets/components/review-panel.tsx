import { Clock, ListChecks, MapPin, Question, Warning } from '@phosphor-icons/react';
import { useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';

import { FullscreenInvalidate, FullscreenMapWrapper } from '@/components/fullscreen-map-wrapper';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { IssueList } from '@/features/proof/components/issue-list';
import { PhotoStrip, type ProofPhoto } from '@/features/proof/components/photo-proof';
import { ProgressRing } from '@/features/proof/components/progress-ring';
import { useShiftIssues, useShiftTasks } from '@/features/proof/hooks';
import { LATE_THRESHOLD_MIN, MISSING_CLOCK_OUT_GRACE_H } from '@/lib/compliance';
import type { Tables, TimeEntryFlag } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';
import { proofPhotoUrl } from '@/lib/supabase';
import { clockInDotIcon, FitBounds, GEOFENCE_PATH_OPTIONS, siteIcon } from '@/lib/map-markers';
import { cn } from '@/lib/utils';
import type { TimesheetRow } from '../hooks';

const FLAG_ICON: Record<TimeEntryFlag, typeof Clock> = {
  late: Clock,
  out_of_zone: MapPin,
  missing_clock_out: Question,
  incomplete_tasks: ListChecks,
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
    case 'incomplete_tasks':
      return `${row.tasks_total - row.tasks_done} of ${row.tasks_total} checklist tasks were left outstanding.`;
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
  workerNames: Record<string, string>;
  busy: boolean;
  onReview: (status: 'approved' | 'rejected') => void;
}

export function ReviewPanel({ row, site, workerNames, busy, onReview }: ReviewPanelProps) {
  const hasPoint = site && row.in_lat !== null && row.in_lng !== null;
  const totalHours =
    row.clock_out_at !== null
      ? (
          (new Date(row.clock_out_at).getTime() - new Date(row.clock_in_at).getTime()) /
          3_600_000
        ).toFixed(2) + ' h'
      : '—';
  const reviewable = row.effective_status === 'pending' || row.effective_status === 'flagged';
  // incomplete_tasks is answered by the proof row below, in amber — it would
  // read as a hard failure inside the destructive attendance alerts.
  const attendanceFlags = row.effective_flags.filter((flag) => flag !== 'incomplete_tasks');

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

        {attendanceFlags.length > 0 ? (
          <div className="flex flex-col gap-2">
            {attendanceFlags.map((flag) => {
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

        {/* Work evidence sits above the decision, in the space the column
            already had — the panel stays inside its compact height. */}
        <ProofOfWorkRow row={row} workerNames={workerNames} />

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

/**
 * The second half of the evidence. The map above answers "was the worker
 * there?"; this answers "did the work happen?" — completion, photo proof and
 * anything they reported from the field.
 */
function ProofOfWorkRow({
  row,
  workerNames,
}: {
  row: TimesheetRow;
  workerNames: Record<string, string>;
}) {
  const tasks = useShiftTasks(row.shift_id);
  const issues = useShiftIssues(row.shift_id);
  const [issuesOpen, setIssuesOpen] = useState(false);

  const outstanding = row.tasks_total - row.tasks_done;
  const workerName = workerNames[row.worker_id] ?? 'Worker';

  const photos: ProofPhoto[] = (tasks.data ?? []).flatMap((task) => {
    const url = proofPhotoUrl(task.photo_url);
    return url
      ? [{ id: task.id, url, title: task.title, workerName, at: task.done_at }]
      : [];
  });
  const openIssues = (issues.data ?? []).filter((issue) => issue.status === 'open');
  const issueCount = issues.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <ProgressRing
            done={row.tasks_done}
            total={row.tasks_total}
            size={36}
            tone={row.incomplete_tasks ? 'warning' : 'primary'}
          />
          <div>
            <p className="text-[11px] text-muted-foreground">Proof of work</p>
            <p
              className={cn(
                'text-xs font-medium',
                row.incomplete_tasks && 'text-warning',
              )}
            >
              {row.tasks_total === 0
                ? 'No checklist on this shift'
                : row.incomplete_tasks
                  ? `${outstanding} task${outstanding === 1 ? '' : 's'} not completed`
                  : `${row.tasks_done} of ${row.tasks_total} tasks completed`}
            </p>
          </div>
        </div>

        {tasks.isPending ? (
          <Skeleton className="h-14 w-32 rounded-lg" />
        ) : (
          photos.length > 0 && <PhotoStrip photos={photos} size={56} />
        )}

        {issueCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={issuesOpen}
            className={cn('ml-auto', openIssues.length > 0 && 'text-danger hover:text-danger')}
            onClick={() => setIssuesOpen((open) => !open)}
          >
            <Warning aria-hidden />
            {issueCount} issue{issueCount === 1 ? '' : 's'} reported
          </Button>
        )}
      </div>

      {issuesOpen && issues.data && (
        <IssueList issues={issues.data} workerNames={workerNames} />
      )}
    </div>
  );
}
