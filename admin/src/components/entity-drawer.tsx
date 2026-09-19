import { X } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface DrawerTab {
  id: string;
  label: string;
}

interface EntityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, closing prompts a discard-changes confirm. */
  dirty?: boolean;
  /** Accessible title (sr-only) + the visible header content. */
  srTitle: string;
  header: ReactNode;
  /** Right-aligned header actions (e.g. an overflow ⋯ menu). */
  headerActions?: ReactNode;
  /** Omit for a single-column drawer (no tab bar) — e.g. the shift sheet. */
  tabs?: DrawerTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** Sticky footer — omit to hide (e.g. autosave tabs). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Supabase-style right drawer: ~50vw (min 560px), overlay dims, tabs keep the
 * height controlled, sticky header + optional sticky footer, dirty-close guard.
 * URL addressability is the caller's job (drives `open` from a search param).
 */
export function EntityDrawer({
  open,
  onOpenChange,
  dirty = false,
  srTitle,
  header,
  headerActions,
  tabs,
  activeTab,
  onTabChange,
  children,
}: EntityDrawerProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = (next: boolean) => {
    if (!next && dirty) {
      setConfirmOpen(true);
      return;
    }
    onOpenChange(next);
  };

  const panel = (
    <>
      {/* Sticky header */}
      <div className="flex items-start gap-3 border-b bg-muted/20 px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0 flex-1">{header}</div>
        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={() => requestClose(false)}
          >
            <X size={16} aria-hidden />
          </Button>
        </div>
      </div>

      {/* Tab bar — only when the entity has tabs. Scrolls horizontally inside
          its own bounded track on narrow screens rather than wrapping, which
          would push the drawer body below the fold. */}
      {tabs && (
        <div className="scroll-x-contained scrollbar-thin border-b px-4 py-2">
          <TabsList variant="line" className="w-max min-w-full">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      )}

      {/* Scrollable body */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{children}</div>

      {/* Sticky footer */}
      {/* {footer && (
        <div className="flex items-center justify-end gap-2 border-t bg-card px-5 py-3">
          {footer}
        </div>
      )} */}
    </>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={requestClose}>
        <SheetContent
          side="right"
          showCloseButton={false}
          // The 560px floor was a hard break below it: at 390px the drawer
          // overflowed the viewport by 170px and took the page into
          // horizontal scroll. The minimum is now a *preference* expressed
          // above `sm`, so a phone gets a full-screen panel instead.
          className="flex w-full flex-col gap-0 p-0 sm:min-w-[min(560px,92vw)] sm:max-w-[min(640px,92vw)]! lg:max-w-[50vw]!"
        >
          <SheetTitle className="sr-only">{srTitle}</SheetTitle>
          <SheetDescription className="sr-only">Details drawer</SheetDescription>

          {tabs ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => onTabChange?.(String(v))}
              className="flex min-h-0 flex-1 flex-col gap-0"
            >
              {panel}
            </Tabs>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">{panel}</div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have edits that haven&apos;t been saved. Close the drawer and discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onOpenChange(false);
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Sticky-footer save affordance for Details/Compliance tabs. */
export function DrawerSaveFooter({
  dirty,
  saving,
  onCancel,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <span
        className={cn(
          'mr-auto flex items-center gap-1.5 text-xs',
          dirty ? 'text-warning' : 'text-muted-foreground',
        )}
      >
        <span className={cn('size-1.5 rounded-full', dirty ? 'bg-warning' : 'bg-transparent')} />
        {dirty ? 'Unsaved changes' : 'All changes saved'}
      </span>
      <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={onCancel}>
        Cancel
      </Button>
      <Button size="sm" disabled={!dirty || saving} onClick={onSave}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </>
  );
}
