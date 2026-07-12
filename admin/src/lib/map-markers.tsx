import L from 'leaflet';
import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

/**
 * The only map glyphs in the product — default Leaflet markers are banned.
 * Site pin: teal rounded square with the site initial (+ name chip at close
 * zoom, toggled via a class on the map container). Worker dot: pulsing green.
 */

export function siteIcon(name: string): L.DivIcon {
  const initial = (name[0] ?? '?').toUpperCase();
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span class="flex flex-col items-center gap-0.5">
      <span class="flex size-7 items-center justify-center rounded-lg bg-primary text-[13px] font-semibold text-white shadow-md ring-2 ring-white">${initial}</span>
      <span class="site-label max-w-32 truncate rounded-lg border bg-card px-1.5 py-px text-[10px] font-medium text-foreground shadow-sm">${name.replace(/</g, '&lt;')}</span>
    </span>`,
  });
}

export const workerDotIcon = L.divIcon({
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  html: '<span class="relative flex size-3.5"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60"></span><span class="relative inline-flex size-3.5 rounded-full border-2 border-white bg-success"></span></span>',
});

/** Clock-in point on timesheet mini-maps: a quiet red dot. */
export const clockInDotIcon = L.divIcon({
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  html: '<span class="flex size-3 rounded-full border-2 border-white bg-danger shadow-sm"></span>',
});

/** Draggable geofence pin (site editor). */
export function draggablePinIcon(name: string): L.DivIcon {
  const initial = (name[0] ?? '?').toUpperCase();
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<span class="flex size-8 cursor-grab items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white shadow-md ring-2 ring-white">${initial}</span>`,
  });
}

/** Geofence circle treatment — teal 40% stroke, 8% fill, everywhere. */
export const GEOFENCE_PATH_OPTIONS = {
  color: '#0F766E',
  opacity: 0.4,
  fillColor: '#0F766E',
  fillOpacity: 0.08,
  weight: 2,
} as const;

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
