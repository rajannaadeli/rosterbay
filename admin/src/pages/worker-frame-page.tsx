import { ArrowLeft } from '@phosphor-icons/react';
import { Link } from 'react-router';

import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';

const WORKER_APP_URL = import.meta.env.VITE_WORKER_APP_URL ?? 'http://localhost:8081';

/**
 * The worker experience for desktop prospects: the Expo web export inside a
 * realistic iPhone. The device sizes to the viewport height (aspect-locked) so
 * it never overflows, with a proper status bar + Dynamic Island and home
 * indicator so it reads as a real phone rather than a boxed iframe.
 */
export function WorkerFramePage() {
  const src = `${WORKER_APP_URL.replace(/\/$/, '')}/?demo=1`;

  return (
    <div className="flex min-h-svh flex-col items-center justify-between gap-4 bg-gradient-to-b from-muted to-background px-6 py-6">
      <div className="flex w-full max-w-3xl items-center justify-between">
        <Button variant="ghost" size="sm" className="text-muted-foreground" render={<Link to="/" />}>
          <ArrowLeft aria-hidden />
          Back
        </Button>
        <Wordmark className="text-base" iconSize={20} />
        <span className="w-16" />
      </div>

      {/* Device — height tracks the viewport, width follows the iPhone aspect. */}
      <div
        className="relative shrink-0 rounded-[3.2rem] bg-neutral-950 p-[11px] shadow-2xl ring-1 ring-black/20"
        style={{ height: 'min(860px, calc(100svh - 11rem))', aspectRatio: '390 / 844' }}
      >
        {/* side buttons */}
        <span className="absolute -left-[3px] top-[110px] h-8 w-[3px] rounded-l bg-neutral-800" aria-hidden />
        <span className="absolute -left-[3px] top-[160px] h-12 w-[3px] rounded-l bg-neutral-800" aria-hidden />
        <span className="absolute -left-[3px] top-[218px] h-12 w-[3px] rounded-l bg-neutral-800" aria-hidden />
        <span className="absolute -right-[3px] top-[175px] h-16 w-[3px] rounded-r bg-neutral-800" aria-hidden />

        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2.5rem] bg-card">
          {/* iOS status bar + Dynamic Island */}
          <div className="relative flex h-11 shrink-0 items-center justify-between px-6">
            <span className="text-[13px] font-semibold tracking-tight text-foreground">9:41</span>
            <div className="absolute left-1/2 top-[9px] h-[26px] w-24 -translate-x-1/2 rounded-full bg-black" />
            <div className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]" aria-hidden>
                <span className="h-1.5 w-[3px] rounded-sm bg-foreground/85" />
                <span className="h-2 w-[3px] rounded-sm bg-foreground/85" />
                <span className="h-2.5 w-[3px] rounded-sm bg-foreground/85" />
                <span className="h-3 w-[3px] rounded-sm bg-foreground/85" />
              </span>
              <span
                className="relative ml-0.5 flex h-3 w-6 items-center rounded-[3px] border border-foreground/40 px-[2px]"
                aria-hidden
              >
                <span className="h-1.5 w-full rounded-[1px] bg-foreground/85" />
                <span className="absolute -right-[3px] top-1/2 h-1.5 w-[2px] -translate-y-1/2 rounded-r-sm bg-foreground/40" />
              </span>
            </div>
          </div>

          <iframe
            src={src}
            title="RosterBay worker app — demo device"
            className="w-full flex-1"
            allow="geolocation; camera"
          />

          {/* home indicator */}
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center">
            <span className="h-1 w-32 rounded-full bg-foreground/25" />
          </div>
        </div>
      </div>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Demo device — signed in as Liam Nguyen, Security Guard. Clock-ins use your browser's
        location; photo tasks use your file picker.
      </p>
    </div>
  );
}
