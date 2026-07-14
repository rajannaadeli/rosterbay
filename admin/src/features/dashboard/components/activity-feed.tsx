import { CheckCircle, Megaphone, SignIn, SignOut } from '@phosphor-icons/react';
import { formatDistanceToNowStrict } from 'date-fns';

import { UserAvatar } from '@/components/user-avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

export type FeedKind = 'clock_in' | 'clock_out' | 'offer' | 'approval';

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
  clock_out: { icon: SignOut, className: 'text-muted-foreground' },
  offer: { icon: Megaphone, className: 'text-primary' },
  approval: { icon: CheckCircle, className: 'text-success' },
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
              <p className="bg-muted/30 px-4 py-1 text-[11px] font-medium text-muted-foreground">
                {day}
              </p>
            )}
            <div
              className={cn(
                'flex items-center gap-2.5 px-4 py-2',
                isNew && 'animate-in fade-in slide-in-from-top-2 rounded-lg bg-primary/5 duration-200',
              )}
            >
              <div className="relative shrink-0">
                {item.actor ? (
                  <UserAvatar name={item.actor} size="sm" />
                ) : (
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-1 ring-inset ring-black/5">
                    •
                  </span>
                )}
                <span
                  className={cn(
                    'absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-card',
                    meta.className,
                  )}
                >
                  <KindIcon size={11} weight="fill" aria-hidden />
                </span>
              </div>
              <p className="min-w-0 flex-1 truncate text-sm">
                <span className="font-medium">{item.lead}</span>{' '}
                <span className="text-muted-foreground">{item.detail}</span>
              </p>
              <Tooltip>
                <TooltipTrigger
                  render={<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums" />}
                >
                  {formatDistanceToNowStrict(new Date(item.at), { addSuffix: false })
                    .replace(/ seconds?/, 's')
                    .replace(/ minutes?/, 'm')
                    .replace(/ hours?/, 'h')
                    .replace(/ days?/, 'd')}
                </TooltipTrigger>
                <TooltipContent>{formatACST(item.at, 'd MMM, h:mm a')}</TooltipContent>
              </Tooltip>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
