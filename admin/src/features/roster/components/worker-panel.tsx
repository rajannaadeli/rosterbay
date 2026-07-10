import { useDraggable } from '@dnd-kit/core';
import { MagnifyingGlass, SidebarSimple } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { CompliancePill } from '@/components/status-pill';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import type { Views } from '@/lib/database.types';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

type WorkerRow = Views<'worker_overview'>;

export function WorkerDragCard({ worker }: { worker: WorkerRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `worker-${worker.id}`,
    data: { worker },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex cursor-grab items-center gap-2 rounded-lg border bg-card px-2.5 py-2 select-none active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
    >
      <Avatar className="size-7">
        {worker.avatar_url && <AvatarImage src={worker.avatar_url} alt="" />}
        <AvatarFallback className="text-[10px]">{initials(worker.full_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{worker.full_name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{worker.job_title}</p>
      </div>
      <CompliancePill status={worker.compliance_status} showIcon={false} className="px-1.5 text-[10px]" />
    </div>
  );
}

interface WorkerPanelProps {
  workers: WorkerRow[] | undefined;
  isPending: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function WorkerPanel({ workers, isPending, collapsed, onToggleCollapsed }: WorkerPanelProps) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const query = useDebounce(search, 300);

  const roles = useMemo(() => {
    const unique = new Set((workers ?? []).map((w) => w.job_title).filter((t) => t !== null));
    return [...unique].sort();
  }, [workers]);

  const filtered = useMemo(
    () =>
      (workers ?? []).filter((worker) => {
        if (role !== 'all' && worker.job_title !== role) return false;
        if (query && !worker.full_name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [workers, query, role],
  );

  if (collapsed) {
    return (
      <div className="flex shrink-0 flex-col items-center rounded-lg border bg-card p-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Expand worker panel"
          onClick={onToggleCollapsed}
        >
          <SidebarSimple aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-2 self-start rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Workers</h2>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Collapse worker panel"
          onClick={onToggleCollapsed}
        >
          <SidebarSimple aria-hidden />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Drag a worker onto a shift to assign.</p>

      <div className="relative">
        <MagnifyingGlass
          size={13}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Label htmlFor="roster-worker-search" className="sr-only">
          Search workers
        </Label>
        <Input
          id="roster-worker-search"
          placeholder="Search…"
          className="h-8 pl-8"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <Select value={role} onValueChange={(value) => setRole(value ?? 'all')}>
        <SelectTrigger size="sm" aria-label="Filter by role" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {roles.map((jobTitle) => (
            <SelectItem key={jobTitle} value={jobTitle}>
              {jobTitle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-0.5">
        {isPending
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)
          : filtered.map((worker) => <WorkerDragCard key={worker.id} worker={worker} />)}
        {!isPending && filtered.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No workers match.</p>
        )}
      </div>
    </aside>
  );
}
