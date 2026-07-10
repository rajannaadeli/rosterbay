import { ArrowDown, ArrowUp, Camera, ListChecks, Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useTaskTemplateMutations, useTaskTemplates } from '@/features/sites/hooks';

interface TaskTemplateEditorProps {
  siteId: string;
  companyId: string;
}

export function TaskTemplateEditor({ siteId, companyId }: TaskTemplateEditorProps) {
  const templates = useTaskTemplates(siteId);
  const { create, update, remove, swap } = useTaskTemplateMutations(siteId);
  const [newTitle, setNewTitle] = useState('');

  const items = templates.data ?? [];

  const addTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    const nextOrder = Math.max(0, ...items.map((t) => t.sort_order)) + 1;
    create.mutate(
      { company_id: companyId, site_id: siteId, title, sort_order: nextOrder },
      { onSuccess: () => setNewTitle('') },
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
      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Add the checklist workers complete on every shift at this site. Toggle the camera for tasks that need photo proof."
        />
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {items.map((task, index) => (
            <li key={task.id} className="flex items-center gap-2 px-3 py-2">
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move "${task.title}" up`}
                  disabled={index === 0 || swap.isPending}
                  onClick={() => {
                    const prev = items[index - 1];
                    if (prev) swap.mutate({ a: task, b: prev });
                  }}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move "${task.title}" down`}
                  disabled={index === items.length - 1 || swap.isPending}
                  onClick={() => {
                    const next = items[index + 1];
                    if (next) swap.mutate({ a: task, b: next });
                  }}
                >
                  <ArrowDown aria-hidden />
                </Button>
              </div>

              <Input
                aria-label="Task title"
                defaultValue={task.title}
                className="h-8 flex-1 border-transparent bg-transparent shadow-none focus-visible:border-input"
                onBlur={(event) => {
                  const title = event.target.value.trim();
                  if (title && title !== task.title) {
                    update.mutate({ id: task.id, patch: { title } });
                  }
                }}
              />

              <div className="flex items-center gap-1.5">
                <Camera
                  size={15}
                  weight={task.requires_photo ? 'duotone' : 'regular'}
                  className={task.requires_photo ? 'text-primary' : 'text-muted-foreground'}
                  aria-hidden
                />
                <Switch
                  aria-label={`Photo proof required for "${task.title}"`}
                  checked={task.requires_photo}
                  onCheckedChange={(checked) =>
                    update.mutate({ id: task.id, patch: { requires_photo: checked === true } })
                  }
                />
              </div>

              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete "${task.title}"`}
                className="text-muted-foreground hover:text-danger"
                onClick={() => remove.mutate(task.id)}
              >
                <Trash aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
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
          Add task
        </Button>
      </div>
    </div>
  );
}
