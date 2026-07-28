import { Clock, ListChecks, MapPin, Question, Warning } from '@phosphor-icons/react';
import { useState } from 'react';
import { Circle, MapContainer, Marker, Polyline } from 'react-leaflet';

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
import { proofPhotoUrl } from '@/lib/supabase';
import {
  clockInDotIcon,
  DISTANCE_LINE_PATH_OPTIONS,
  FitBounds,
  GEOFENCE_PATH_OPTIONS,
  MapTiles,
  siteIcon,
} from '@/lib/map-markers';
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
    <div className="e1 rounded-sm px-3 py-2">
      <p className="label-micro">{label}</p>
      <p className="num mt-0.5 text-body font-medium">{value}</p>
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
    <div className="grid grid-cols-1 gap-4 border-t border-border-subtle bg-surface-2/40 p-4 lg:grid-cols-2">
      <div className="relative">
        {hasPoint ? (
          <>
            <FullscreenMapWrapper
              className="h-[260px] overflow-hidden rounded-lg border border-border-subtle"
              hint={false}
            >
              <MapContainer
                center={[site.lat, site.lng]}
                zoom={15}
                className="z-0 h-full w-full"
                scrollWheelZoom={true}
              >
                <MapTiles />
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
                  pathOptions={DISTANCE_LINE_PATH_OPTIONS}
                />
              </MapContainer>
              <span
                style={{ zIndex: 999 }}
                className="absolute bottom-3 left-3 rounded-sm border border-border-default bg-surface-1/90 px-2 py-1.5 shadow-[var(--elevation-2)] backdrop-blur-sm"
              >
                <span
                  className={cn(
                    'num text-micro tracking-normal',
                    row.within_geofence === false ? 'text-danger' : 'text-text-secondary',
                  )}
                >
                  {Math.round(Number(row.distance_from_site_m ?? 0))} m from site
                </span>
              </span>
            </FullscreenMapWrapper>
          </>
        ) : (
          <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border-default text-small text-text-secondary">
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
              const FlagIcon = FLAG_ICON[flag] as typeof Clock | undefined;
              if (!FlagIcon) return null;
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
          <p className="text-small text-text-secondary">
            Clean entry — clocked in on time, inside the geofence.
          </p>
        )}

        {/* Work evidence sits above the decision, in the space the column
            already had — the panel stays inside its compact height. */}
        <ProofOfWorkRow row={row} workerNames={workerNames} />

        <div className="mt-auto flex items-center justify-end gap-2">
          {row.reviewed_at && (
            <span className="mr-auto text-micro tracking-normal text-text-tertiary">
              Reviewed <span className="num">{formatACST(row.reviewed_at, 'd MMM, h:mm a')}</span>
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
    <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <ProgressRing
            done={row.tasks_done}
            total={row.tasks_total}
            size={36}
            tone={row.incomplete_tasks ? 'warning' : 'primary'}
          />
          <div>
            <p className="label-micro">Proof of work</p>
            <p
              className={cn(
                'mt-0.5 text-small font-medium',
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
