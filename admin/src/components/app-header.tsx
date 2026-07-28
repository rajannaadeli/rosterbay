import {
  MagnifyingGlass,
  SidebarSimple,
  SignOut,
  UserCircle,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { CommandSearch } from '@/components/command-search';
import { NotificationsBell } from '@/components/notifications-bell';
import { useSidebar } from '@/components/sidebar-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession, useSignOut } from '@/features/auth/hooks';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

const BREADCRUMB_LABELS: Record<string, string> = {
  app: 'Home',
  dashboard: 'Dashboard',
  roster: 'Roster',
  workers: 'Workers',
  timesheets: 'Timesheets',
  sites: 'Job Sites',
  new: 'New',
};

function segmentLabel(segment: string): string {
  return (
    BREADCRUMB_LABELS[segment] ??
    segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);

export function AppHeader() {
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { collapsed, setCollapsed } = useSidebar();
  const session = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();

  // Skip the leading "app" segment — the breadcrumb starts at the module.
  const segments = pathname.split('/').filter(Boolean).slice(1);

  // The page body never scrolls in this shell — <main> does — so the topbar's
  // scrolled state has to come from that element, not from window.scrollY.
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 4);
    onScroll();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSignOut = () => {
    signOut.mutate(undefined, { onSuccess: () => void navigate('/') });
  };

  return (
    <TooltipProvider delay={200}>
      <header
        className={cn(
          'sticky top-0 z-30 flex h-[57px] shrink-0 items-center gap-2 px-3 transition-[background-color,border-color,backdrop-filter] duration-[var(--duration-standard)]',
          scrolled
            ? 'border-b border-border-subtle bg-background/80 supports-backdrop-filter:backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={() => setCollapsed((v) => !v)}
              />
            }
          >
            <SidebarSimple size={16} aria-hidden />
          </TooltipTrigger>
          <TooltipContent>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-[40%] my-auto" />

        <Breadcrumb className="min-w-0 flex-1 ml-1">
          <BreadcrumbList>
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1;
              const href = '/app/' + segments.slice(0, index + 1).join('/');
              const isUuid = /^[0-9a-f-]{30,}$/.test(segment);
              const label = isUuid ? 'Detail' : segmentLabel(segment);

              return (
                <span key={href} className="flex items-center gap-1.5">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link to={href} />}>{label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-2">
          <span className="num mr-2 hidden text-micro tracking-normal text-text-tertiary lg:inline">
            {formatACST(new Date(), 'EEE, d MMM yyyy')}
          </span>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={cn(
              'flex h-8 items-center gap-2 rounded-sm border border-border-default bg-surface-2 pr-1.5 pl-3 text-small text-text-secondary',
              'transition-colors duration-[var(--duration-micro)] hover:border-border-strong hover:text-foreground',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            )}
          >
            <MagnifyingGlass size={14} aria-hidden />
            <span className="hidden sm:inline">Search…</span>
            {/* Keycap, not a bordered label — it should read as the physical key. */}
            <kbd className="num pointer-events-none hidden rounded-xs border border-border-default border-b-2 bg-surface-1 px-1.5 py-0.5 text-micro tracking-normal leading-none font-medium text-text-tertiary select-none sm:inline">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          </button>

          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account menu"
                  className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            >
              <Avatar className="size-8 rounded-full">
                <AvatarFallback className="rounded-full bg-primary text-micro font-semibold tracking-normal text-primary-foreground">
                  M
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" side="bottom" align="end" sideOffset={6}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <Avatar className="size-9 rounded-full">
                  <AvatarFallback className="rounded-full bg-primary text-micro font-semibold tracking-normal text-primary-foreground">
                    M
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Marcus Webb</span>
                  <span className="num truncate text-micro tracking-normal text-text-tertiary">
                    {session.data?.user.email}
                  </span>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Admin
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <UserCircle aria-hidden /> Profile — coming in this demo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                <SignOut aria-hidden /> Exit demo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </TooltipProvider>
  );
}
