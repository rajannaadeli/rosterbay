import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, DotsSixVertical, ListChecks, Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
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
import { Switch } from '@/components/ui/switch';
import { useTaskTemplateMutations, useTaskTemplates } from '@/features/sites/hooks';
import type { Tables } from '@/lib/database.types';
import { cn } from '@/lib/utils';

type Task = Tables<'task_templates'>;

interface TaskTemplateEditorProps {
  siteId: string;
  companyId: string;
}

const saved = () => toast.success('Saved', { duration: 1500 });

export function TaskTemplateEditor({ siteId, companyId }: TaskTemplateEditorProps) {
  const templates = useTaskTemplates(siteId);
  const { create, update, remove, reorder } = useTaskTemplateMutations(siteId);
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  // Server data is the source of truth; drag applies an optimistic cache write
  // so reordering feels instant without a local mirror + sync effect.
  const order = templates.data ?? [];
  const tasksKey = ['sites', siteId, 'tasks'] as const;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    const nextOrder = Math.max(0, ...order.map((t) => t.sort_order)) + 1;
    create.mutate(
      { company_id: companyId, site_id: siteId, title, sort_order: nextOrder },
      {
        onSuccess: () => {
          setNewTitle('');
          saved();
        },
      },
    );
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((t) => t.id === active.id);
    const newIndex = order.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    // Optimistic cache write — instant visual reorder, reconciled on refetch.
    queryClient.setQueryData<Task[]>(tasksKey, next);
    reorder.mutate(
      next.map((t) => t.id),
      { onSuccess: saved },
    );
  };

  if (templates.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        The checklist workers complete on every shift here. Drag to reorder; changes save
        automatically.
      </p>

      {order.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Add the first checklist item below. Turn on Photo proof for tasks that need a camera capture."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col divide-y rounded-lg border bg-card">
              {order.map((task) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  onRename={(title) => {
                    if (title && title !== task.title) {
                      update.mutate({ id: task.id, patch: { title } }, { onSuccess: saved });
                    }
                  }}
                  onTogglePhoto={(requires_photo) =>
                    update.mutate({ id: task.id, patch: { requires_photo } }, { onSuccess: saved })
                  }
                  onDelete={() => setPendingDelete(task)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center gap-2">
        <Label htmlFor="new-task" className="sr-only">
          New task title
        </Label>
        <Input
          id="new-task"
          placeholder="Add a task — e.g. Photograph secured loading dock"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTask();
            }
          }}
        />
        <Button variant="secondary" onClick={addTask} disabled={create.isPending || !newTitle.trim()}>
          <Plus aria-hidden />
          Add
        </Button>
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this task?</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; will be removed from this site&apos;s checklist.
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
                if (pendingDelete) {
                  remove.mutate(pendingDelete.id, {
                    onSuccess: () => {
                      saved();
                      setPendingDelete(null);
                    },
                  });
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SortableTaskRowProps {
  task: Task;
  onRename: (title: string) => void;
  onTogglePhoto: (requiresPhoto: boolean) => void;
  onDelete: () => void;
}

function SortableTaskRow({ task, onRename, onTogglePhoto, onDelete }: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-2 bg-card px-2 py-2',
        isDragging && 'relative z-10 shadow-md',
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical size={16} aria-hidden />
      </button>

      <Input
        aria-label="Task title"
        defaultValue={task.title}
        className="h-8 flex-1 border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background"
        onBlur={(event) => onRename(event.target.value.trim())}
      />

      <label
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors',
          task.requires_photo ? 'border-primary/40 bg-primary/5 text-primary' : 'text-muted-foreground',
        )}
      >
        <Camera size={14} weight={task.requires_photo ? 'duotone' : 'regular'} aria-hidden />
        Photo proof
        <Switch
          aria-label={`Photo proof required for "${task.title}"`}
          checked={task.requires_photo}
          onCheckedChange={(checked) => onTogglePhoto(checked === true)}
        />
      </label>

      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Delete "${task.title}"`}
        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
        onClick={onDelete}
      >
        <Trash aria-hidden />
      </Button>
    </li>
  );
}
