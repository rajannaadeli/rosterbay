import { MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkersTable } from '@/features/workers/components/workers-table';
import { useWorkers } from '@/features/workers/hooks';
import type { CertStatus } from '@/lib/database.types';

type ComplianceFilter = 'all' | CertStatus;

export function WorkersPage() {
  const workers = useWorkers();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [compliance, setCompliance] = useState<ComplianceFilter>('all');

  const roles = useMemo(() => {
    const unique = new Set((workers.data ?? []).map((w) => w.job_title).filter((t) => t !== null));
    return [...unique].sort();
  }, [workers.data]);

  const filtered = useMemo(() => {
    return (workers.data ?? []).filter((worker) => {
      if (role !== 'all' && worker.job_title !== role) return false;
      if (compliance !== 'all' && worker.compliance_status !== compliance) return false;
      if (search && !worker.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [workers.data, search, role, compliance]);

  const hasFilters = search !== '' || role !== 'all' || compliance !== 'all';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Workers</h1>
          <p className="text-sm text-muted-foreground">
            The Torrens field team — compliance at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Label htmlFor="worker-search" className="sr-only">
              Search workers
            </Label>
            <Input
              id="worker-search"
              placeholder="Search workers…"
              className="w-56 pl-8"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={role} onValueChange={(value) => setRole(value ?? 'all')}>
            <SelectTrigger aria-label="Filter by role" className="w-40">
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
          <Select
            value={compliance}
            onValueChange={(value) => setCompliance((value as ComplianceFilter | null) ?? 'all')}
          >
            <SelectTrigger aria-label="Filter by compliance" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All compliance</SelectItem>
              <SelectItem value="valid">Compliant</SelectItem>
              <SelectItem value="expiring_soon">Expiring</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <WorkersTable workers={filtered} isPending={workers.isPending} hasFilters={hasFilters} />
    </div>
  );
}
