import { ArrowLeft } from '@phosphor-icons/react';
import { Link } from 'react-router';

import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';

const WORKER_APP_URL = import.meta.env.VITE_WORKER_APP_URL ?? 'http://localhost:8081';

/**
 * The worker experience for desktop prospects: the Expo web export inside a
 * phone bezel. ?demo=1 tells the embedded app to auto-sign-in as Liam.
 */
export function WorkerFramePage() {
  const src = `${WORKER_APP_URL.replace(/\/$/, '')}/?demo=1`;

  return (
    <div className="flex min-h-svh flex-col items-center gap-5 bg-background px-6 py-8">
      <div className="flex w-full max-w-3xl items-center justify-between">
        <Button variant="ghost" size="sm" className="text-muted-foreground" render={<Link to="/" />}>
          <ArrowLeft aria-hidden />
          Back
        </Button>
        <Wordmark className="text-base" iconSize={20} />
        <span className="w-16" />
      </div>

      <div className="rounded-[46px] border-[10px] border-foreground/90 bg-foreground/90 shadow-xl">
        <div className="relative overflow-hidden rounded-[36px] bg-background">
          <div className="absolute top-2 left-1/2 z-10 h-5 w-28 -translate-x-1/2 rounded-full bg-foreground/90" aria-hidden />
          <iframe
            src={src}
            title="RosterBay worker app — demo device"
            className="h-[780px] w-[390px]"
            allow="geolocation; camera"
          />
        </div>
      </div>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Demo device — signed in as Liam Nguyen, Security Guard. Clock-ins use your browser's
        location; photo tasks use your file picker.
      </p>
    </div>
  );
}
