/* eslint-disable react-refresh/only-export-components */
import {
  CalendarCheck,
  ClockCountdown,
  ClockCounterClockwise,
  MapPin,
  MapPinArea,
  SquaresFour,
  User,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useSites } from '@/features/sites/hooks';
import { useWorkers } from '@/features/workers/hooks';
import { useDebounce } from '@/hooks/use-debounce';

interface NavEntry {
  label: string;
  href: string;
  icon: Icon;
  group: string;
}

const ALL_NAV_ITEMS: NavEntry[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: SquaresFour, group: 'Overview' },
  { label: 'Roster', href: '/app/roster', icon: CalendarCheck, group: 'Operations' },
  { label: 'Timesheets', href: '/app/timesheets', icon: ClockCountdown, group: 'Operations' },
  { label: 'Workers', href: '/app/workers', icon: UsersThree, group: 'Workforce' },
  { label: 'Job Sites', href: '/app/sites', icon: MapPinArea, group: 'Workforce' },
];

const RECENT_KEY = 'rb-recent-pages';
const MAX_RECENT = 5;

function getRecentPages(): { label: string; href: string }[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as { label: string; href: string }[]) : [];
  } catch {
    return [];
  }
}

export function trackRecentPage(label: string, href: string) {
  try {
    const recent = getRecentPages().filter((page) => page.href !== href);
    recent.unshift({ label, href });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable — recents are a nicety, not a requirement
  }
}

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  // Debounce gates when the (cached) entity lists join the results.
  const debounced = useDebounce(query, 300);
  const workers = useWorkers();
  const sites = useSites();

  const recent = open ? getRecentPages() : [];

  const runItem = useCallback(
    (href: string, label: string) => {
      trackRecentPage(label, href);
      void navigate(href);
      onOpenChange(false);
      setQuery('');
    },
    [navigate, onOpenChange],
  );

  const groups = ALL_NAV_ITEMS.reduce<Record<string, NavEntry[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  const showEntities = debounced.trim().length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery('');
      }}
    >
      <CommandInput
        placeholder="Search pages, workers, sites…"
        autoFocus
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {recent.length > 0 && !showEntities && (
          <>
            <CommandGroup heading="Recent">
              {recent.map((page) => (
                <CommandItem
                  key={page.href}
                  value={`recent ${page.label}`}
                  onSelect={() => runItem(page.href, page.label)}
                >
                  <ClockCounterClockwise className="text-muted-foreground" aria-hidden />
                  <span>{page.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {Object.entries(groups).map(([groupLabel, items]) => (
          <CommandGroup key={groupLabel} heading={groupLabel}>
            {items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${groupLabel} ${item.label}`}
                onSelect={() => runItem(item.href, item.label)}
              >
                <item.icon weight="duotone" className="text-muted-foreground" aria-hidden />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {showEntities && (workers.data?.length ?? 0) > 0 && (
          <CommandGroup heading="Workers">
            {workers.data?.map((worker) => (
              <CommandItem
                key={worker.id}
                value={`worker ${worker.full_name} ${worker.job_title ?? ''}`}
                onSelect={() => runItem(`/app/workers?open=${worker.id}`, worker.full_name)}
              >
                <User weight="duotone" className="text-muted-foreground" aria-hidden />
                <span>{worker.full_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{worker.job_title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showEntities && (sites.data?.length ?? 0) > 0 && (
          <CommandGroup heading="Job Sites">
            {sites.data?.map((site) => (
              <CommandItem
                key={site.id}
                value={`site ${site.name} ${site.client_name ?? ''}`}
                onSelect={() => runItem(`/app/sites?site=${site.id}`, site.name)}
              >
                <MapPin weight="duotone" className="text-muted-foreground" aria-hidden />
                <span>{site.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{site.client_name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
