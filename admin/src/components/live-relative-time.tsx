import { formatDistanceToNowStrict } from 'date-fns';
import { useEffect, useState } from 'react';

import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * How often to re-render, by how stale the timestamp is. A row that says
 * "4s ago" has to tick every second to stay honest; one that says "3h ago"
 * does not, and re-rendering it every second across a 200-row feed is pure
 * waste.
 */
function intervalFor(ms: number): number {
  if (ms < 60_000) return 1_000;
  if (ms < 3_600_000) return 30_000;
  return 300_000;
}

/** date-fns says "1 minute"; an ops console says "1m". */
function compact(at: Date): string {
  return formatDistanceToNowStrict(at)
    .replace(/ seconds?/, 's')
    .replace(/ minutes?/, 'm')
    .replace(/ hours?/, 'h')
    .replace(/ days?/, 'd')
    .replace(/ months?/, 'mo')
    .replace(/ years?/, 'y');
}

interface LiveRelativeTimeProps {
  at: Date | string | number;
  /** Append " ago". Off when the caller already supplies the word. */
  suffix?: boolean;
  className?: string;
}

/**
 * A relative timestamp that actually advances — 4s ago → 1m ago — with the
 * absolute ACST time on hover. Static relative times are the tell that a
 * "live" screen isn't.
 */
export function LiveRelativeTime({ at, suffix = true, className }: LiveRelativeTimeProps) {
  const date = at instanceof Date ? at : new Date(at);
  const [label, setLabel] = useState(() => compact(date));

  useEffect(() => {
    let timer: number;

    const tick = () => {
      setLabel(compact(date));
      timer = window.setTimeout(tick, intervalFor(Date.now() - date.getTime()));
    };

    tick();
    return () => window.clearTimeout(timer);
  }, [date.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <time
      dateTime={date.toISOString()}
      title={formatACST(date, 'd MMM yyyy, h:mm:ss a')}
      className={cn('num', className)}
    >
      {label}
      {suffix ? ' ago' : ''}
    </time>
  );
}
