import { ArrowsIn, ArrowsOut } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMap } from 'react-leaflet';

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
}

/**
 * Wraps a map section with a fullscreen toggle button.
 * The wrapper itself becomes the fullscreen element.
 */
export function FullscreenMapWrapper({ children, className = '', style }: FullscreenMapWrapperProps) {
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
    <div ref={wrapperRef} className={`relative bg-card ${className}`} style={style}>
      {children}
      <button
        type="button"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={toggle}
        style={{ zIndex: 1000 }}
        className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-[5px] border bg-card text-foreground shadow-sm transition-all hover:border-primary hover:text-primary active:scale-94 active:bg-primary active:text-white"
      >
        {isFullscreen ? <ArrowsIn size={16} weight="bold" /> : <ArrowsOut size={16} weight="bold" />}
      </button>
    </div>
  );
}
