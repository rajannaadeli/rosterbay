import { Warning } from '@phosphor-icons/react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useState } from 'react';

import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { formatACST } from '@/lib/format';
import { proofPhotoUrl } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAcknowledgeIssue } from '../hooks';
import { ProofLightbox } from './photo-proof';
import type { Issue } from '../api';

interface IssueListProps {
  issues: Issue[];
  workerNames: Record<string, string>;
}

/**
 * What the worker reported from the field. Acknowledge is the only reply an
 * admin can make — a message thread is on the spec §10 kill list.
 */
export function IssueList({ issues, workerNames }: IssueListProps) {
  const acknowledge = useAcknowledgeIssue();
  const [photoIssue, setPhotoIssue] = useState<Issue | null>(null);
  const photoIssueUrl = proofPhotoUrl(photoIssue?.photo_url ?? null);

  if (issues.length === 0) {
    return <p className="text-xs text-muted-foreground">No issues reported on this shift.</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
      {issues.map((issue) => {
        const open = issue.status === 'open';
        const photo = proofPhotoUrl(issue.photo_url);
        return (
          // Note gets its own full-width line; the meta and the single action
          // sit below it, so a long report can never crowd the thumbnail or
          // push the panel wider than its column.
          <li
            key={issue.id}
            className={cn(
              'flex flex-col gap-2 rounded-lg border px-3 py-2.5',
              open ? 'border-danger/30 bg-danger/5' : 'bg-muted/30',
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg',
                  open ? 'bg-danger/10 text-danger' : 'bg-muted text-muted-foreground',
                )}
              >
                <Warning size={14} weight="duotone" aria-hidden />
              </span>

              <p className="min-w-0 flex-1 text-sm break-words">{issue.note}</p>

              {photo && (
                <button
                  type="button"
                  aria-label="View the reported issue photo"
                  className="shrink-0 overflow-hidden rounded-lg border transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => setPhotoIssue(issue)}
                >
                  <img src={photo} alt="" className="size-11 object-cover" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pl-[34px]">
              <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {workerNames[issue.worker_id] ?? 'Worker'} ·{' '}
                {formatDistanceToNowStrict(new Date(issue.created_at), { addSuffix: true })}
                {!open && issue.acknowledged_at && (
                  <> · acknowledged {formatACST(issue.acknowledged_at, 'd MMM, h:mm a')}</>
                )}
              </p>

              {open ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={acknowledge.isPending}
                  onClick={() => acknowledge.mutate(issue.id)}
                >
                  Acknowledge
                </Button>
              ) : (
                <StatusPill tone="success" label="Acknowledged" className="shrink-0" />
              )}
            </div>
          </li>
        );
      })}
      </ul>

      {photoIssue && photoIssueUrl && (
        <ProofLightbox
          photos={[
            {
              id: photoIssue.id,
              url: photoIssueUrl,
              title: photoIssue.note,
              workerName: workerNames[photoIssue.worker_id] ?? 'Worker',
              at: photoIssue.created_at,
            },
          ]}
          index={0}
          onIndexChange={() => undefined}
          onClose={() => setPhotoIssue(null)}
        />
      )}
    </>
  );
}
