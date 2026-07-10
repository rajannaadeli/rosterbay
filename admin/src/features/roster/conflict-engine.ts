import type { CertStatus, ShiftStatus } from '@/lib/database.types';
import { MAX_WEEK_HOURS } from '@/lib/compliance';

/**
 * The conflict engine — pure logic, no IO. Runs on every drop before any
 * mutation. Covered by conflict-engine.test.ts (the one required suite).
 *
 * Rules (spec §4.4 / data-model skill):
 * - cert compliance    → hard block, overridable with a logged reason
 * - double-booking     → hard block, NEVER overridable
 * - >38h in the week   → soft warn (assign anyway allowed)
 */

export interface ConflictShift {
  id: string;
  site_id: string;
  starts_at: string;
  ends_at: string;
  status: ShiftStatus;
}

export interface ConflictCert {
  cert_type_id: string;
  status: CertStatus;
  expires_on: string;
}

export interface CheckAssignmentInput {
  worker: { id: string; full_name: string };
  targetShift: ConflictShift;
  site: { name: string; required_cert_type_ids: string[] };
  /** cert_type_id → display name. */
  certTypeNames: Record<string, string>;
  workerCerts: ConflictCert[];
  /** The worker's other shifts in the target week (target excluded). */
  workerWeekShifts: ConflictShift[];
  /** site_id → name, for double-booking messages. */
  siteNamesById?: Record<string, string>;
  maxWeekHours?: number;
  now?: Date;
}

export interface AssignmentBlock {
  type: 'cert_missing' | 'cert_expired' | 'double_booking';
  message: string;
  overridable: boolean;
}

export interface AssignmentWarning {
  type: 'week_hours';
  message: string;
  currentHours: number;
  projectedHours: number;
}

export interface AssignmentCheck {
  verdict: 'ok' | 'warn' | 'block';
  blocks: AssignmentBlock[];
  warnings: AssignmentWarning[];
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

function hoursBetween(startsAt: string, endsAt: string): number {
  return (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 3_600_000;
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Adelaide',
  });
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
}

export function checkAssignment(input: CheckAssignmentInput): AssignmentCheck {
  const {
    worker,
    targetShift,
    site,
    certTypeNames,
    workerCerts,
    workerWeekShifts,
    siteNamesById = {},
    maxWeekHours = MAX_WEEK_HOURS,
    now = new Date(),
  } = input;

  const blocks: AssignmentBlock[] = [];
  const warnings: AssignmentWarning[] = [];
  const name = firstName(worker.full_name);

  // ── Cert compliance (hard block, overridable) ──────────────────────────────
  for (const requiredId of site.required_cert_type_ids) {
    const certName = certTypeNames[requiredId] ?? 'a required certificate';
    const held = workerCerts.filter((cert) => cert.cert_type_id === requiredId);

    if (held.length === 0) {
      blocks.push({
        type: 'cert_missing',
        message: `${name} has no ${certName} on file — required at ${site.name}.`,
        overridable: true,
      });
      continue;
    }

    // A renewal supersedes an expired copy — judge the freshest document.
    const best = held.reduce((a, b) => (a.expires_on >= b.expires_on ? a : b));
    if (best.status === 'expired') {
      const daysAgo = Math.max(
        1,
        Math.round((now.getTime() - new Date(`${best.expires_on}T00:00:00`).getTime()) / 86_400_000),
      );
      blocks.push({
        type: 'cert_expired',
        message: `${name}'s ${certName} expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago (${formatDate(best.expires_on)}) — required at ${site.name}.`,
        overridable: true,
      });
    }
  }

  // ── Double-booking (hard block, never overridable) ─────────────────────────
  const targetStart = new Date(targetShift.starts_at).getTime();
  const targetEnd = new Date(targetShift.ends_at).getTime();
  for (const shift of workerWeekShifts) {
    if (shift.id === targetShift.id || shift.status === 'cancelled') continue;
    const start = new Date(shift.starts_at).getTime();
    const end = new Date(shift.ends_at).getTime();
    // Strict inequality: back-to-back shifts (end === start) are legal.
    if (targetStart < end && start < targetEnd) {
      const siteName = siteNamesById[shift.site_id] ?? 'another site';
      blocks.push({
        type: 'double_booking',
        message: `Already assigned ${formatShort(shift.starts_at)}–${formatShort(shift.ends_at)} at ${siteName}.`,
        overridable: false,
      });
    }
  }

  // ── Weekly hours (soft warn) ────────────────────────────────────────────────
  const currentHours = workerWeekShifts
    .filter((shift) => shift.id !== targetShift.id && shift.status !== 'cancelled')
    .reduce((sum, shift) => sum + hoursBetween(shift.starts_at, shift.ends_at), 0);
  const projectedHours = currentHours + hoursBetween(targetShift.starts_at, targetShift.ends_at);

  if (projectedHours > maxWeekHours) {
    warnings.push({
      type: 'week_hours',
      message: `This puts ${name} at ${projectedHours.toFixed(1)} h this week (currently ${currentHours.toFixed(1)} h) — over the ${maxWeekHours} h threshold.`,
      currentHours,
      projectedHours,
    });
  }

  return {
    verdict: blocks.length > 0 ? 'block' : warnings.length > 0 ? 'warn' : 'ok',
    blocks,
    warnings,
  };
}
