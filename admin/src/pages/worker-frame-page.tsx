import { ArrowLeft } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';

const WORKER_APP_URL = import.meta.env.VITE_WORKER_APP_URL ?? 'http://localhost:8081';

// The device renders at a FIXED logical size so the embedded app never reflows;
// only the whole phone is scaled (transform) to fit the available space.
const BEZEL = 11;
const SCREEN_W = 390; // iPhone logical width — the app is designed for this
const SCREEN_H = 844; // iPhone logical height
const DEVICE_W = SCREEN_W + BEZEL * 2;
const DEVICE_H = SCREEN_H + BEZEL * 2;

/**
 * The worker experience for desktop prospects: the Expo web export inside a
 * realistic iPhone. The device is a fixed 390×844 logical phone; a resize
 * observer scales it to fit the viewport, so the content inside is identical at
 * every window size / zoom level — only the frame grows or shrinks.
 */
export function WorkerFramePage() {
  const src = `${WORKER_APP_URL.replace(/\/$/, '')}/?demo=1`;
  const fitRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      // Never upscale past 1:1 — keep the app crisp; shrink to fit otherwise.
      setScale(Math.min(0.8, width / DEVICE_W, height / DEVICE_H));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center gap-3 overflow-hidden bg-linear-to-b from-muted to-background px-6 py-5">
      <div className="flex w-full max-w-3xl shrink-0 items-center justify-between">
        <Button variant="ghost" size="sm" className="text-muted-foreground" render={<Link to="/" />}>
          <ArrowLeft aria-hidden />
          Back
        </Button>
        <Wordmark className="text-base" iconSize={20} />
        <span className="w-16" />
      </div>

      {/* Fit area — the observer measures this; the phone scales to fill it. */}
      <div ref={fitRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div style={{ width: DEVICE_W * scale, height: DEVICE_H * scale }}>
          <div
            style={{ width: DEVICE_W, height: DEVICE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            className="relative rounded-[3.2rem] bg-neutral-950 shadow-2xl ring-1 ring-black/20"
          >
            <div style={{ padding: BEZEL }} className="h-full w-full">
              {/* side buttons */}
              <span className="absolute left-[-3px] top-[104px] h-8 w-[3px] rounded-l bg-neutral-800" aria-hidden />
              <span className="absolute left-[-3px] top-[152px] h-12 w-[3px] rounded-l bg-neutral-800" aria-hidden />
              <span className="absolute left-[-3px] top-[210px] h-12 w-[3px] rounded-l bg-neutral-800" aria-hidden />
              <span className="absolute right-[-3px] top-[168px] h-16 w-[3px] rounded-r bg-neutral-800" aria-hidden />

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
                      <span className="absolute right-[-3px] top-1/2 h-1.5 w-[2px] -translate-y-1/2 rounded-r-sm bg-foreground/40" />
                    </span>
                  </div>
                </div>

                <iframe
                  src={src}
                  title="RosterBay worker app — demo device"
                  style={{ width: SCREEN_W }}
                  className="flex-1"
                  allow="geolocation; camera"
                />

                {/* home indicator */}
                <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center">
                  <span className="h-1 w-32 rounded-full bg-foreground/25" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="max-w-sm shrink-0 text-center text-xs text-muted-foreground">
        Demo device — signed in as Liam Nguyen, Security Guard. Clock-ins use your browser's
        location; photo tasks use your file picker.
      </p>
    </div>
  );
}
