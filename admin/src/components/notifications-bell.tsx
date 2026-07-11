import { Bell, CheckCircle, Megaphone, Tray } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarkAllRead, useNotifications, useNotificationsRealtime } from '@/features/notifications/hooks';
import { cn } from '@/lib/utils';

function kindIcon(kind: string) {
  if (kind === 'offer') return Megaphone;
  if (kind === 'offer_won' || kind === 'offer_filled') return CheckCircle;
  return Bell;
}

export function NotificationsBell() {
  const notifications = useNotifications();
  const markAllRead = useMarkAllRead();
  useNotificationsRealtime();

  const rows = notifications.data ?? [];
  const unread = rows.filter((row) => !row.read).length;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unread > 0) markAllRead.mutate();
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative text-muted-foreground"
            aria-label={unread > 0 ? `Notifications — ${unread} unread` : 'Notifications'}
          />
        }
      >
        <Bell size={16} aria-hidden />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" side="bottom" align="end" sideOffset={6}>
        <div className="border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Tray size={22} weight="duotone" className="text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Nothing yet — offer activity lands here.
            </p>
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {rows.map((row) => {
              const KindIcon = kindIcon(row.kind);
              return (
                <li
                  key={row.id}
                  className={cn(
                    'flex gap-2.5 border-b px-3 py-2.5 last:border-b-0',
                    !row.read && 'bg-primary/5',
                  )}
                >
                  <KindIcon
                    size={16}
                    weight="duotone"
                    className="mt-0.5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{row.title}</p>
                    {row.body && <p className="text-xs text-muted-foreground">{row.body}</p>}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
