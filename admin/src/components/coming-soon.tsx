import { HardHat } from '@phosphor-icons/react';

/** The single placeholder every future-phase nav item routes to. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-lg bg-muted p-4">
        <HardHat size={30} weight="duotone" className="text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Coming in this demo. This module ships in a later phase of the RosterBay build — Workers
        and Job Sites are fully live today.
      </p>
    </div>
  );
}
