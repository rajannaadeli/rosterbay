import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

import type { Tables } from '@/lib/database.types';
import type { TimesheetRow } from '@/features/timesheets/hooks';
import { formatACST } from '@/lib/format';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';

// Green pulsing dot for a clocked-in worker (MM1's map moment). The classes
// exist in the bundle already, so the divIcon HTML picks them up.
const onSiteIcon = L.divIcon({
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  html: '<span class="relative flex size-3.5"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60"></span><span class="relative inline-flex size-3.5 rounded-full border-2 border-white bg-success"></span></span>',
});

interface LiveMapProps {
  sites: Tables<'job_sites'>[];
  /** Open entries (no clock-out, shift in progress) with coordinates. */
  onSite: TimesheetRow[];
  workerNames: Record<string, string>;
  siteNames: Record<string, string>;
}

export function LiveMap({ sites, onSite, workerNames, siteNames }: LiveMapProps) {
  const center: [number, number] = [-34.928, 138.59];

  return (
    <MapContainer center={center} zoom={11} className="h-full w-full z-0" scrollWheelZoom={false}>
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      {sites.map((site) => (
        <Marker key={site.id} position={[site.lat, site.lng]}>
          <Popup>
            <span className="text-sm font-medium">{site.name}</span>
            <br />
            <span className="text-xs">{site.client_name}</span>
          </Popup>
        </Marker>
      ))}
      {onSite.map((entry) =>
        entry.in_lat !== null && entry.in_lng !== null ? (
          <Marker
            key={entry.id}
            position={[entry.in_lat, entry.in_lng]}
            icon={onSiteIcon}
            zIndexOffset={1000}
          >
            <Popup>
              <span className="text-sm font-medium">
                {workerNames[entry.worker_id] ?? 'Worker'}
              </span>
              <br />
              <span className="text-xs">
                {siteNames[entry.site_id] ?? 'Site'} · on site since{' '}
                {formatACST(entry.clock_in_at, 'h:mm a')}
              </span>
            </Popup>
          </Marker>
        ) : null,
      )}
    </MapContainer>
  );
}
