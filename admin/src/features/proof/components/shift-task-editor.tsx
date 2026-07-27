import { Camera, Check, Lock, Plus, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ShiftStatus } from '@/lib/database.types';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useShiftTaskMutations } from '../hooks';
import { nextSortOrder, tasksEditable } from '../task-instantiation';
import type { ShiftTask } from '../api';

interface ShiftTaskEditorProps {
  shiftId: string;
  companyId: string;
  shiftStatus: ShiftStatus;
  tasks: ShiftTask[];
  isPending: boolean;
}

export function ShiftTaskEditor({
  shiftId,
  companyId,
  shiftStatus,
  tasks,
  isPending,
}: ShiftTaskEditorProps) {
  const { add, remove, togglePhoto } = useShiftTaskMutations();
  const [newTitle, setNewTitle] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ShiftTask | null>(null);
  const editable = tasksEditable(shiftStatus);

  const addTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    add.mutate(
      {
        company_id: companyId,
        shift_id: shiftId,
        title,
        sort_order: nextSortOrder(tasks),
      },
      {
        onSuccess: () => {
          setNewTitle('');
          toast.success('Task added to this shift', { duration: 1500 });
        },
      },
    );
  };

  if (isPending) {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          This shift has no checklist — its site had no tasks when the shift was created.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              editable={editable}
              busy={togglePhoto.isPending}
              onTogglePhoto={() =>
                togglePhoto.mutate({ taskId: task.id, requiresPhoto: !task.requires_photo })
              }
              onRemove={() => setPendingDelete(task)}
            />
          ))}
        </ul>
      )}

      {editable ? (
        <div className="flex items-center gap-2">
          <Label htmlFor="new-shift-task" className="sr-only">
            Add a task to this shift
          </Label>
          <Input
            id="new-shift-task"
            className="h-8"
            placeholder="Add a task for this shift — press Enter"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTask();
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={addTask}
            disabled={add.isPending || newTitle.trim() === ''}
          >
            <Plus aria-hidden />
            Add
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock size={13} weight="duotone" aria-hidden />
          Shift completed — tasks are read-only.
        </p>
      )}

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this task from the shift?</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; disappears from {"the worker's"} checklist. The
              site&apos;s template is untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (!pendingDelete) return;
                remove.mutate(pendingDelete.id, {
                  onSuccess: () => {
                    toast.success('Task removed', { duration: 1500 });
                    setPendingDelete(null);
                  },
                });
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TaskRowProps {
  task: ShiftTask;
  editable: boolean;
  busy: boolean;
  onTogglePhoto: () => void;
  onRemove: () => void;
}

function TaskRow({ task, editable, busy, onTogglePhoto, onRemove }: TaskRowProps) {
  const photoSatisfied = task.photo_url !== null;

  return (
    <li className="group flex items-center gap-2.5 px-2.5 py-2">
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded border',
          task.done ? 'border-success bg-success text-white' : 'border-border bg-card',
        )}
        aria-hidden
      >
        {task.done && <Check size={12} weight="bold" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm', !task.done && 'text-muted-foreground')}>
          {task.title}
        </p>
        {task.done && task.done_at && (
          <p className="text-[11px] text-success tabular-nums">
            Done {formatACST(task.done_at, 'h:mm a')}
          </p>
        )}
      </div>

      {task.source === 'adhoc' && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Added
        </Badge>
      )}

      {/* Requirement is only changeable while the task is still outstanding —
          once it's ticked, the photo (or its absence) is part of the record. */}
      {editable && !task.done ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-pressed={task.requires_photo}
                aria-label={`Photo proof ${task.requires_photo ? 'required' : 'not required'} for "${task.title}"`}
                disabled={busy}
                className={cn(
                  'shrink-0',
                  task.requires_photo
                    ? 'text-primary'
                    : 'text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
                )}
                onClick={onTogglePhoto}
              />
            }
          >
            <Camera size={14} weight={task.requires_photo ? 'duotone' : 'regular'} aria-hidden />
          </TooltipTrigger>
          <TooltipContent>
            {task.requires_photo ? 'Photo proof required — click to drop' : 'Require photo proof'}
          </TooltipContent>
        </Tooltip>
      ) : (
        (task.requires_photo || photoSatisfied) && (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
              <Camera
                size={14}
                weight="duotone"
                className={photoSatisfied ? 'text-success' : 'text-primary'}
                aria-label={photoSatisfied ? 'Photo proof submitted' : 'Photo proof required'}
              />
            </TooltipTrigger>
            <TooltipContent>
              {photoSatisfied ? 'Photo proof submitted' : 'Photo proof required'}
            </TooltipContent>
          </Tooltip>
        )
      )}

      {editable && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Remove "${task.title}"`}
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
          onClick={onRemove}
        >
          <X size={13} aria-hidden />
        </Button>
      )}
    </li>
  );
}
