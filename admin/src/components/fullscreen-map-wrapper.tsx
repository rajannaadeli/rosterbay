import { ArrowsIn, ArrowsOut } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMap } from 'react-leaflet';

import { LiveRelativeTime } from '@/components/live-relative-time';

/**
 * Drop-in Leaflet fullscreen wrapper — wrap any `<MapContainer>` content and
 * get a polished fullscreen toggle in the bottom-right corner.  Uses the
 * native Fullscreen API so it works regardless of layout context (drawers,
 * panels, cards…).
 *
 * Place `<FullscreenInvalidate />` *inside* each `<MapContainer>` so Leaflet
 * re-tiles when the viewport changes.
 */

/** Place inside `<MapContainer>` — calls `invalidateSize` on fullscreen change. */
export function FullscreenInvalidate() {
  const map = useMap();

  useEffect(() => {
    const handler = () => {
      setTimeout(() => map.invalidateSize(), 100);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [map]);

  return null;
}

interface FullscreenMapWrapperProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Bottom-left keyboard/pointer hint. Pass `false` to suppress. */
  hint?: string | false;
  /** Bottom-right live line — a ticking "Updated 4s ago" off this timestamp. */
  updatedAt?: Date | string | number | null;
}

/**
 * Wraps a map section with a fullscreen toggle button.
 * The wrapper itself becomes the fullscreen element.
 */
export function FullscreenMapWrapper({
  children,
  className = '',
  style,
  hint = 'Scroll to zoom · Drag to pan',
  updatedAt,
}: FullscreenMapWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggle = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  return (
    // `isolate` keeps Leaflet's own z-indexes (and this button's) inside the
    // map's stacking context — without it they punch through modals opened
    // over the map, e.g. the photo-proof lightbox.
    <div ref={wrapperRef} className={`relative isolate bg-surface-2 ${className}`} style={style}>
      {children}

      {/* Chrome sits above Leaflet's own panes (z-index 400–700) but inside
          the wrapper's stacking context, so it can't escape over a modal. */}
      <div
        style={{ zIndex: 1000 }}
        className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3"
      >
        {hint ? (
          <span className="label-micro rounded-xs bg-surface-1/85 px-1.5 py-1 text-text-tertiary backdrop-blur-sm">
            {hint}
          </span>
        ) : (
          <span />
        )}

        <div className="pointer-events-auto flex items-center gap-2">
          {updatedAt != null && <MapLiveStamp at={updatedAt} />}
          <button
            type="button"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={toggle}
            className="flex size-8 items-center justify-center rounded-sm border border-border-default bg-surface-1 text-foreground shadow-[var(--elevation-2)] transition-all duration-[var(--duration-micro)] hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-94 active:bg-primary active:text-primary-foreground"
          >
            {isFullscreen ? (
              <ArrowsIn size={16} weight="bold" />
            ) : (
              <ArrowsOut size={16} weight="bold" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Updated 4s ago", ticking, with a live dot. Absolute time on hover. */
function MapLiveStamp({ at }: { at: Date | string | number }) {
  return (
    // No title here — LiveRelativeTime already carries the absolute time, and
    // two nested tooltips means the outer one wins and the precise one never shows.
    <span className="flex items-center gap-1.5 rounded-sm border border-border-default bg-surface-1/90 px-2 py-1.5 shadow-[var(--elevation-2)] backdrop-blur-sm">
      <span className="size-1.5 shrink-0 animate-[live-pulse_2s_var(--ease-inout)_infinite] rounded-full bg-success" />
      <span className="label-micro text-text-secondary">
        Updated <LiveRelativeTime at={at} />
      </span>
    </span>
  );
}
