import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterChipProps {
  /** Prefix label shown before the value — e.g. "Role". */
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
}

/**
 * The one labeled filter combobox — `Role: All`, `Compliance: Expired`.
 * No bare, unlabeled select may exist anywhere; use this instead.
 */
export function FilterChip({ label, value, options, onChange, className }: FilterChipProps) {
  const active = value !== (options[0]?.value ?? 'all');
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-lg border bg-background pl-2.5 transition-colors',
        active && 'border-primary/40 bg-primary/5',
        className,
      )}
    >
      <span className="text-xs text-muted-foreground">{label}:</span>
      <Select value={value} onValueChange={(v) => onChange(v ?? (options[0]?.value ?? 'all'))}>
        <SelectTrigger
          size="sm"
          aria-label={`Filter by ${label.toLowerCase()}`}
          className="w-fit gap-1 border-0 bg-transparent pr-2 pl-1 shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
