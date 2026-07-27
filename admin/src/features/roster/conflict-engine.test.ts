import { describe, expect, it } from 'vitest';

import {
  instantiateShiftTasks,
  nextSortOrder,
  tasksEditable,
  type ChecklistTemplate,
} from '@/features/proof/task-instantiation';
import { checkAssignment, type CheckAssignmentInput, type ConflictShift } from './conflict-engine';

const FIRST_AID = 'ct-first-aid';
const WHITE_CARD = 'ct-white-card';

const CERT_NAMES = { [FIRST_AID]: 'First Aid', [WHITE_CARD]: 'White Card' };

function shift(overrides: Partial<ConflictShift> = {}): ConflictShift {
  return {
    id: 'shift-target',
    site_id: 'site-hospital',
    starts_at: '2026-07-13T06:00:00+09:30',
    ends_at: '2026-07-13T14:00:00+09:30',
    status: 'open',
    ...overrides,
  };
}

function baseInput(overrides: Partial<CheckAssignmentInput> = {}): CheckAssignmentInput {
  return {
    worker: { id: 'w1', full_name: 'Jack O’Connell' },
    targetShift: shift(),
    site: { name: 'North Adelaide Private Hospital', required_cert_type_ids: [FIRST_AID] },
    certTypeNames: CERT_NAMES,
    workerCerts: [
      { cert_type_id: FIRST_AID, status: 'valid', expires_on: '2027-01-01' },
    ],
    workerWeekShifts: [],
    siteNamesById: { 'site-cbd': 'Kingsford Corporate Tower' },
    now: new Date('2026-07-10T12:00:00+09:30'),
    ...overrides,
  };
}

describe('cert compliance', () => {
  it('passes with a valid cert', () => {
    const result = checkAssignment(baseInput());
    expect(result.verdict).toBe('ok');
    expect(result.blocks).toHaveLength(0);
  });

  it('blocks (overridable) when the cert is missing entirely', () => {
    const result = checkAssignment(baseInput({ workerCerts: [] }));
    expect(result.verdict).toBe('block');
    expect(result.blocks[0]?.type).toBe('cert_missing');
    expect(result.blocks[0]?.overridable).toBe(true);
    expect(result.blocks[0]?.message).toContain('First Aid');
    expect(result.blocks[0]?.message).toContain('North Adelaide Private Hospital');
  });

  it('blocks (overridable) when the cert is expired, naming the expiry', () => {
    const result = checkAssignment(
      baseInput({
        workerCerts: [{ cert_type_id: FIRST_AID, status: 'expired', expires_on: '2026-07-04' }],
      }),
    );
    expect(result.verdict).toBe('block');
    expect(result.blocks[0]?.type).toBe('cert_expired');
    expect(result.blocks[0]?.overridable).toBe(true);
    expect(result.blocks[0]?.message).toContain("Jack's First Aid expired 6 days ago");
  });

  it('a fresh renewal supersedes an old expired copy', () => {
    const result = checkAssignment(
      baseInput({
        workerCerts: [
          { cert_type_id: FIRST_AID, status: 'expired', expires_on: '2026-07-04' },
          { cert_type_id: FIRST_AID, status: 'valid', expires_on: '2029-07-04' },
        ],
      }),
    );
    expect(result.verdict).toBe('ok');
  });

  it('expiring_soon still counts as currently valid', () => {
    const result = checkAssignment(
      baseInput({
        workerCerts: [
          { cert_type_id: FIRST_AID, status: 'expiring_soon', expires_on: '2026-07-19' },
        ],
      }),
    );
    expect(result.verdict).toBe('ok');
  });

  it('checks every required cert, not just the first', () => {
    const result = checkAssignment(
      baseInput({
        site: {
          name: 'North Adelaide Private Hospital',
          required_cert_type_ids: [FIRST_AID, WHITE_CARD],
        },
      }),
    );
    expect(result.verdict).toBe('block');
    expect(result.blocks[0]?.message).toContain('White Card');
  });
});

describe('double-booking', () => {
  const overlapping: ConflictShift = {
    id: 'shift-other',
    site_id: 'site-cbd',
    starts_at: '2026-07-13T10:00:00+09:30',
    ends_at: '2026-07-13T18:00:00+09:30',
    status: 'assigned',
  };

  it('blocks overlap with no override, naming the conflicting shift', () => {
    const result = checkAssignment(baseInput({ workerWeekShifts: [overlapping] }));
    expect(result.verdict).toBe('block');
    const block = result.blocks.find((b) => b.type === 'double_booking');
    expect(block?.overridable).toBe(false);
    expect(block?.message).toContain('Kingsford Corporate Tower');
  });

  it('allows exact back-to-back shifts (end == start boundary)', () => {
    const backToBack: ConflictShift = {
      ...overlapping,
      starts_at: '2026-07-13T14:00:00+09:30', // target ends 14:00
      ends_at: '2026-07-13T22:00:00+09:30',
    };
    const result = checkAssignment(baseInput({ workerWeekShifts: [backToBack] }));
    expect(result.verdict).toBe('ok');
  });

  it('one-minute overlap at the boundary still blocks', () => {
    const oneMinute: ConflictShift = {
      ...overlapping,
      starts_at: '2026-07-13T13:59:00+09:30',
      ends_at: '2026-07-13T22:00:00+09:30',
    };
    const result = checkAssignment(baseInput({ workerWeekShifts: [oneMinute] }));
    expect(result.verdict).toBe('block');
  });

  it('ignores cancelled shifts', () => {
    const result = checkAssignment(
      baseInput({ workerWeekShifts: [{ ...overlapping, status: 'cancelled' }] }),
    );
    expect(result.verdict).toBe('ok');
  });
});

describe('weekly hours', () => {
  // Four 8h shifts on other days = 32h; the 8h target projects to 40h.
  const eightHourDays: ConflictShift[] = [14, 15, 16, 17].map((day) => ({
    id: `shift-${day}`,
    site_id: 'site-cbd',
    starts_at: `2026-07-${day}T06:00:00+09:30`,
    ends_at: `2026-07-${day}T14:00:00+09:30`,
    status: 'assigned',
  }));

  it('warns past 38h with correct totals, and stays assignable', () => {
    const result = checkAssignment(baseInput({ workerWeekShifts: eightHourDays }));
    expect(result.verdict).toBe('warn');
    expect(result.blocks).toHaveLength(0);
    expect(result.warnings[0]?.currentHours).toBe(32);
    expect(result.warnings[0]?.projectedHours).toBe(40);
    expect(result.warnings[0]?.message).toContain('40.0 h');
  });

  it('exactly 38h does not warn (threshold is strictly greater-than)', () => {
    // 30h existing + 8h target = 38h exactly.
    const thirtyHours = eightHourDays.slice(0, 3).concat({
      id: 'shift-six',
      site_id: 'site-cbd',
      starts_at: '2026-07-17T08:00:00+09:30',
      ends_at: '2026-07-17T14:00:00+09:30',
      status: 'assigned',
    });
    const result = checkAssignment(baseInput({ workerWeekShifts: thirtyHours }));
    expect(result.verdict).toBe('ok');
  });

  it('cert block and hours warning can coexist — verdict stays block', () => {
    const result = checkAssignment(
      baseInput({ workerCerts: [], workerWeekShifts: eightHourDays }),
    );
    expect(result.verdict).toBe('block');
    expect(result.warnings).toHaveLength(1);
  });
});

// ── Task instantiation (templates → shift snapshot) ───────────────────────────

const SITE_CHECKLIST: ChecklistTemplate[] = [
  { id: 'tpl-vacuum', title: 'Vacuum lobby & level-1 corridors', requires_photo: false, sort_order: 1 },
  { id: 'tpl-bins', title: 'Empty bins — all levels', requires_photo: false, sort_order: 2 },
  { id: 'tpl-floor', title: 'Photo of cleaned lobby floor', requires_photo: true, sort_order: 3 },
];

const forShift = (templates: ChecklistTemplate[], shiftId = 'shift-new') =>
  instantiateShiftTasks({ templates, shiftId, companyId: 'company-torrens' });

describe('task instantiation', () => {
  it('copies every template onto the shift, in order, as template-sourced tasks', () => {
    const tasks = forShift(SITE_CHECKLIST);
    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.title)).toEqual([
      'Vacuum lobby & level-1 corridors',
      'Empty bins — all levels',
      'Photo of cleaned lobby floor',
    ]);
    expect(tasks.every((t) => t.source === 'template')).toBe(true);
    expect(tasks.every((t) => t.shift_id === 'shift-new')).toBe(true);
    expect(tasks.every((t) => t.company_id === 'company-torrens')).toBe(true);
  });

  it('carries photo-proof by value and keeps template_id as provenance', () => {
    const tasks = forShift(SITE_CHECKLIST);
    expect(tasks.map((t) => t.requires_photo)).toEqual([false, false, true]);
    expect(tasks.map((t) => t.template_id)).toEqual(['tpl-vacuum', 'tpl-bins', 'tpl-floor']);
  });

  it('re-indexes positions 1..n, closing gaps in the template ordering', () => {
    const gappy: ChecklistTemplate[] = [
      { id: 'a', title: 'Third', requires_photo: false, sort_order: 90 },
      { id: 'b', title: 'First', requires_photo: false, sort_order: 4 },
      { id: 'c', title: 'Second', requires_photo: false, sort_order: 12 },
    ];
    const tasks = forShift(gappy);
    expect(tasks.map((t) => t.sort_order)).toEqual([1, 2, 3]);
    expect(tasks.map((t) => t.title)).toEqual(['First', 'Second', 'Third']);
  });

  it('is a snapshot: editing the site templates afterwards never reaches the shift', () => {
    const templates = SITE_CHECKLIST.map((t) => ({ ...t }));
    const existingShift = forShift(templates, 'shift-yesterday');

    // Marcus renames a task, turns photo proof off, drops one and adds another.
    templates[0]!.title = 'Vacuum lobby, corridors AND stairwells';
    templates[2]!.requires_photo = false;
    templates.splice(1, 1);
    templates.push({ id: 'tpl-lifts', title: 'Polish lift doors', requires_photo: false, sort_order: 4 });

    expect(existingShift.map((t) => t.title)).toEqual([
      'Vacuum lobby & level-1 corridors',
      'Empty bins — all levels',
      'Photo of cleaned lobby floor',
    ]);
    expect(existingShift[2]!.requires_photo).toBe(true);
    expect(existingShift).toHaveLength(3);

    // A shift created *after* the edit picks up the new checklist — the two
    // snapshots legitimately differ.
    const newShift = forShift(templates, 'shift-tomorrow');
    expect(newShift.map((t) => t.title)).toEqual([
      'Vacuum lobby, corridors AND stairwells',
      'Photo of cleaned lobby floor',
      'Polish lift doors',
    ]);
  });

  it('produces rows that share no reference with the template objects', () => {
    const templates = SITE_CHECKLIST.map((t) => ({ ...t }));
    const tasks = forShift(templates);
    expect(tasks as unknown as ChecklistTemplate[]).not.toContain(templates[0]);
    expect(Object.hasOwn(tasks[0]!, 'sort_order')).toBe(true);
  });

  it('handles a site with no checklist', () => {
    expect(forShift([])).toEqual([]);
  });
});

describe('nextSortOrder', () => {
  it('appends after the highest existing position', () => {
    expect(nextSortOrder([{ sort_order: 1 }, { sort_order: 6 }, { sort_order: 3 }])).toBe(7);
  });

  it('starts at 1 on an empty checklist', () => {
    expect(nextSortOrder([])).toBe(1);
  });
});

describe('tasksEditable', () => {
  it('allows edits until the shift completes', () => {
    expect(tasksEditable('open')).toBe(true);
    expect(tasksEditable('assigned')).toBe(true);
    expect(tasksEditable('in_progress')).toBe(true);
  });

  it('locks the checklist once the shift is a record', () => {
    expect(tasksEditable('completed')).toBe(false);
    expect(tasksEditable('cancelled')).toBe(false);
  });
});
