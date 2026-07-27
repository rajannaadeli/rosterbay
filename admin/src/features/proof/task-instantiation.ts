import type { Tables, TablesInsert } from '@/lib/database.types';

/** The only template fields a shift snapshot needs. */
export type ChecklistTemplate = Pick<
  Tables<'task_templates'>,
  'id' | 'title' | 'requires_photo' | 'sort_order'
>;

export interface InstantiateShiftTasksInput {
  templates: readonly ChecklistTemplate[];
  shiftId: string;
  companyId: string;
}

/**
 * Copies a site's checklist onto a newly created shift.
 *
 * This is a **snapshot, not a live link** (spec §1): title and requires_photo
 * are carried by value, so editing — or deleting — the template afterwards can
 * never reach back into a shift that already exists. Past shifts are records,
 * not documents. `template_id` is kept purely as provenance (it nulls out if
 * the template is deleted, which leaves the snapshot intact).
 *
 * Positions are re-indexed 1..n so the shift's own ordering stays gap-free no
 * matter what the template `sort_order` values look like; ad-hoc tasks added
 * later append via `nextSortOrder`.
 */
export function instantiateShiftTasks({
  templates,
  shiftId,
  companyId,
}: InstantiateShiftTasksInput): TablesInsert<'shift_tasks'>[] {
  return [...templates]
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    .map((template, index) => ({
      company_id: companyId,
      shift_id: shiftId,
      template_id: template.id,
      title: template.title,
      requires_photo: template.requires_photo,
      sort_order: index + 1,
      source: 'template' as const,
    }));
}

/** Position for a task appended to an existing shift checklist. */
export function nextSortOrder(tasks: readonly { sort_order: number }[]): number {
  return tasks.reduce((max, task) => Math.max(max, task.sort_order), 0) + 1;
}
