import L from 'leaflet';
import { useEffect } from 'react';
import { TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { useTheme } from '@/components/theme-provider';
import { OSM_ATTRIBUTION, TILE_URL } from '@/lib/leaflet';

/**
 * The only map glyphs in the product — default Leaflet markers are banned.
 * Site pin: accent rounded-square with the site initial (+ name chip at close
 * zoom, toggled via a class on the map container). Worker dot: a success-hued
 * dot under two expanding rings.
 *
 * These are HTML strings handed to Leaflet, so they can carry Tailwind classes
 * but not React — the classes must appear literally here for the compiler to
 * see them. Ring colours use `ring-surface-1` rather than white so a pin keeps
 * its halo against a dark tile set.
 */

export function siteIcon(name: string): L.DivIcon {
  const initial = (name[0] ?? '?').toUpperCase();
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span class="flex flex-col items-center gap-0.5">
      <span class="map-pin-glow flex size-7 items-center justify-center rounded-sm bg-primary text-small font-semibold text-primary-foreground ring-2 ring-surface-1">${initial}</span>
      <span class="site-label max-w-32 truncate rounded-xs border border-border-default bg-surface-3 px-1.5 py-px text-micro tracking-normal font-medium text-foreground shadow-[var(--elevation-2)]">${name.replace(/</g, '&lt;')}</span>
    </span>`,
  });
}

/** On-site worker: solid dot, two rings expanding out of phase behind it. */
export const workerDotIcon = L.divIcon({
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  html:
    '<span class="relative flex size-3.5">' +
    '<span class="absolute inset-0 rounded-full bg-success animate-[ping-ring_2s_var(--ease-out)_infinite]"></span>' +
    '<span class="absolute inset-0 rounded-full bg-success animate-[ping-ring_2s_var(--ease-out)_infinite] [animation-delay:1s]"></span>' +
    '<span class="relative inline-flex size-3.5 rounded-full border-2 border-surface-1 bg-success"></span>' +
    '</span>',
});

/** Clock-in point on timesheet mini-maps: a quiet red dot. */
export const clockInDotIcon = L.divIcon({
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  html: '<span class="flex size-3 rounded-full border-2 border-surface-1 bg-danger shadow-[var(--elevation-2)]"></span>',
});

/** Draggable geofence pin (site editor). */
export function draggablePinIcon(name: string): L.DivIcon {
  const initial = (name[0] ?? '?').toUpperCase();
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<span class="map-pin-glow flex size-8 cursor-grab items-center justify-center rounded-sm bg-primary text-body font-semibold text-primary-foreground ring-2 ring-surface-1">${initial}</span>`,
  });
}

/**
 * Geofence circle — accent stroke at 40%, fill at 8%.
 *
 * The hue comes from a CSS class, not from `color`: Leaflet writes its path
 * options to SVG *presentation attributes*, which don't resolve `var()`, so a
 * token could never reach the stroke that way. The class is styled in
 * index.css, where the accent differs per theme.
 */
export const GEOFENCE_PATH_OPTIONS = {
  className: 'geofence-ring',
  opacity: 0.4,
  fillOpacity: 0.08,
  weight: 2,
} as const;

/** Site → clock-in point on timesheet maps. Same CSS-class trick as above. */
export const DISTANCE_LINE_PATH_OPTIONS = {
  className: 'distance-line',
  dashArray: '6 6',
  weight: 2,
} as const;

/**
 * The basemap, following the app theme. Every `<MapContainer>` uses this
 * instead of its own `<TileLayer>` so a theme swap can't leave one map on the
 * wrong tile set.
 *
 * The `key` forces a remount on theme change — Leaflet caches tiles per layer
 * instance, so mutating the URL alone leaves the old tiles on screen.
 */
export function MapTiles() {
  const { resolvedTheme } = useTheme();
  return (
    <TileLayer
      key={resolvedTheme}
      url={TILE_URL[resolvedTheme]}
      attribution={OSM_ATTRIBUTION}
      // CartoDB shards across a–d; Leaflet's default is only a–c.
      subdomains="abcd"
      maxZoom={20}
    />
  );
}

/** Fits the map to its markers with sane padding whenever they change. */
export function FitBounds({ points, maxZoom = 15 }: { points: [number, number][]; maxZoom?: number }) {
  const map = useMap();
  const signature = JSON.stringify(points);

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature, maxZoom]);

  return null;
}

/** Shows site-name chips only when zoomed close enough to read them. */
export function SiteLabelVisibility({ threshold = 12 }: { threshold?: number }) {
  const apply = (map: L.Map) => {
    map.getContainer().classList.toggle('map-labels-hidden', map.getZoom() < threshold);
  };
  const map = useMapEvents({ zoomend: () => apply(map) });

  useEffect(() => {
    apply(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}
