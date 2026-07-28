import {
  Camera,
  CheckCircle,
  ListChecks,
  Megaphone,
  SignIn,
  SignOut,
  Warning,
} from '@phosphor-icons/react';
import { LiveRelativeTime } from '@/components/live-relative-time';
import { UserAvatar } from '@/components/user-avatar';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

export type FeedKind =
  | 'clock_in'
  | 'clock_out'
  | 'offer'
  | 'approval'
  | 'task_photo'
  | 'tasks_complete'
  | 'issue';

export interface ActivityItem {
  id: string;
  at: string;
  kind: FeedKind;
  /** Name driving the avatar; null for system events (offer broadcasts). */
  actor: string | null;
  /** Bold lead (usually the actor), rendered before the detail. */
  lead: string;
  detail: string;
}

const KIND_META: Record<FeedKind, { icon: typeof SignIn; className: string }> = {
  clock_in: { icon: SignIn, className: 'text-success' },
  clock_out: { icon: SignOut, className: 'text-text-tertiary' },
  offer: { icon: Megaphone, className: 'text-primary' },
  approval: { icon: CheckCircle, className: 'text-success' },
  task_photo: { icon: Camera, className: 'text-primary' },
  tasks_complete: { icon: ListChecks, className: 'text-success' },
  issue: { icon: Warning, className: 'text-danger' },
};

function dayLabel(iso: string): string {
  const day = formatACST(iso, 'yyyy-MM-dd');
  const today = formatACST(new Date(), 'yyyy-MM-dd');
  const yesterday = formatACST(new Date(Date.now() - 86_400_000), 'yyyy-MM-dd');
  if (day === today) return 'Today';
  if (day === yesterday) return 'Yesterday';
  return formatACST(iso, 'EEEE d MMM');
}

export function ActivityFeed({
  items,
  mountedAt,
}: {
  items: ActivityItem[];
  mountedAt: string;
}) {
  // Precompute divider flags so render stays pure (no mutable cursor).
  const rows = items.map((item, index) => {
    const day = dayLabel(item.at);
    const showDivider = index === 0 || day !== dayLabel(items[index - 1]!.at);
    return { item, day, showDivider };
  });

  return (
    <ul className="flex flex-col">
      {rows.map(({ item, day, showDivider }) => {
        const meta = KIND_META[item.kind];
        const KindIcon = meta.icon;
        const isNew = item.at > mountedAt;

        return (
          <li key={item.id}>
            {showDivider && (
              <p className="label-micro sticky top-0 z-10 bg-surface-2/90 px-4 py-1.5 backdrop-blur-sm">
                {day}
              </p>
            )}
            <div
              className={cn(
                'flex items-center gap-2.5 px-4 py-2 transition-colors duration-[var(--duration-micro)] hover:bg-surface-2/60',
                isNew &&
                  'animate-in fade-in slide-in-from-top-2 rounded-sm bg-accent-muted duration-[var(--duration-standard)] ease-[var(--ease-out)]',
              )}
            >
              <div className="relative shrink-0">
                {item.actor ? (
                  <UserAvatar name={item.actor} size="sm" />
                ) : (
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-surface-2 text-micro tracking-normal text-text-tertiary ring-1 ring-inset ring-border-subtle">
                    •
                  </span>
                )}
                <span
                  className={cn(
                    'absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-surface-1',
                    meta.className,
                  )}
                >
                  <KindIcon size={11} weight="fill" aria-hidden />
                </span>
              </div>
              <p className="min-w-0 flex-1 truncate text-body">
                <span className="font-medium">{item.lead}</span>{' '}
                <span className="text-text-secondary">{item.detail}</span>
              </p>
              {/* Ticks on its own now — this used to be a frozen relative
                  time on a screen that claims to be live. */}
              <LiveRelativeTime
                at={item.at}
                suffix={false}
                className="shrink-0 text-micro tracking-normal text-text-tertiary"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
