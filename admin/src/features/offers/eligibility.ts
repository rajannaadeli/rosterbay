import { checkAssignment, type ConflictCert } from '@/features/roster/conflict-engine';
import type { Tables, Views } from '@/lib/database.types';

export interface EligibilityInput {
  shift: Tables<'shifts'>;
  site: Tables<'job_sites'>;
  workers: Views<'worker_overview'>[];
  certsByWorker: Map<string, ConflictCert[]>;
  /** All non-cancelled shifts in the shift's week (for overlap checks). */
  weekShifts: Tables<'shifts'>[];
  certTypeNames: Record<string, string>;
}

/**
 * Broadcast targets — reuses the tested conflict engine: role match,
 * cert-compliant at the site, no time overlap. Hour warnings don't exclude
 * (a worker over 38h can still choose to accept).
 */
export function eligibleWorkers({
  shift,
  site,
  workers,
  certsByWorker,
  weekShifts,
  certTypeNames,
}: EligibilityInput) {
  return workers.filter((worker) => {
    if (shift.role_required && worker.job_title !== shift.role_required) return false;
    const check = checkAssignment({
      worker: { id: worker.id, full_name: worker.full_name },
      targetShift: shift,
      site: { name: site.name, required_cert_type_ids: site.required_cert_type_ids },
      certTypeNames,
      workerCerts: certsByWorker.get(worker.id) ?? [],
      workerWeekShifts: weekShifts.filter((s) => s.worker_id === worker.id && s.id !== shift.id),
    });
    return check.verdict !== 'block';
  });
}
