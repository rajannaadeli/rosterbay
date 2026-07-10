import { UsersThree } from '@phosphor-icons/react';
import { useNavigate } from 'react-router';

import { EmptyState } from '@/components/empty-state';
import { CompliancePill } from '@/components/status-pill';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Views } from '@/lib/database.types';
import { formatACST, initials } from '@/lib/format';

interface WorkersTableProps {
  workers: Views<'worker_overview'>[] | undefined;
  isPending: boolean;
  hasFilters: boolean;
}

export function WorkersTable({ workers, isPending, hasFilters }: WorkersTableProps) {
  const navigate = useNavigate();

  if (!isPending && (workers?.length ?? 0) === 0) {
    return (
      <EmptyState
        icon={UsersThree}
        title={hasFilters ? 'No workers match those filters' : 'No workers yet'}
        description={
          hasFilters
            ? 'Try clearing the search or switching the role and compliance filters back to all.'
            : 'Workers appear here once they join Torrens Facility Services.'
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>Job title</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead className="text-right">Shifts this week</TableHead>
            <TableHead>Last clock-in</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending
            ? Array.from({ length: 8 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24 rounded-lg" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                </TableRow>
              ))
            : workers?.map((worker) => (
                <TableRow
                  key={worker.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => void navigate(`/app/workers/${worker.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void navigate(`/app/workers/${worker.id}`);
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        {worker.avatar_url && (
                          <AvatarImage src={worker.avatar_url} alt="" />
                        )}
                        <AvatarFallback className="text-xs">
                          {initials(worker.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{worker.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{worker.job_title}</TableCell>
                  <TableCell className="text-muted-foreground">{worker.phone}</TableCell>
                  <TableCell>
                    <CompliancePill status={worker.compliance_status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {worker.shifts_this_week}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {worker.last_clock_in_at
                      ? formatACST(worker.last_clock_in_at, 'd MMM, h:mm a')
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
