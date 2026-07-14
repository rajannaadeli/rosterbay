import { useDraggable } from '@dnd-kit/core';
import { DotsSixVertical, MagnifyingGlass, SidebarSimple } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { CompliancePill } from '@/components/status-pill';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import type { Views } from '@/lib/database.types';
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
        'group flex h-14 cursor-grab items-center gap-2 rounded-lg border bg-card pl-1 pr-2 select-none active:cursor-grabbing mx-0.5',
        isDragging && 'opacity-40',
      )}
    >
      <DotsSixVertical
        size={16}
        className="shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground"
        aria-hidden
      />
      <UserAvatar name={worker.full_name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{worker.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">{worker.job_title}</p>
      </div>
      <CompliancePill status={worker.compliance_status} showIcon={false} className="px-1.5 text-[10px]" />
    </div>
  );
}

const ROLE_SEGMENTS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Cleaner', label: 'Cleaners' },
  { id: 'Security Guard', label: 'Security' },
];

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
    <aside className="flex max-h-[calc(100vh-11rem)] w-60 shrink-0 flex-col gap-2.5 self-start rounded-lg border bg-card p-3">
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

      {/* Segmented role control — two roles, one tap. */}
      <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Filter by role">
        {ROLE_SEGMENTS.map((seg) => (
          <button
            key={seg.id}
            type="button"
            aria-pressed={role === seg.id}
            onClick={() => setRole(seg.id)}
            className={cn(
              'flex-1 rounded-lg py-1 text-xs font-medium transition-colors',
              role === seg.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {seg.label}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">Drag a worker onto a shift to assign.</p>

      <div className="scrollbar-thin -mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="scroll-fade-y flex flex-col gap-1.5 pb-3">
          {isPending
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
            : filtered.map((worker) => <WorkerDragCard key={worker.id} worker={worker} />)}
          {!isPending && filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">No workers match.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
