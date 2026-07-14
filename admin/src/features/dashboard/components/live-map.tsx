import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

import { FullscreenInvalidate, FullscreenMapWrapper } from '@/components/fullscreen-map-wrapper';
import type { Tables } from '@/lib/database.types';
import type { TimesheetRow } from '@/features/timesheets/hooks';
import { formatACST } from '@/lib/format';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';
import { FitBounds, SiteLabelVisibility, siteIcon, workerDotIcon } from '@/lib/map-markers';

interface LiveMapProps {
  sites: Tables<'job_sites'>[];
  /** Open entries (no clock-out, shift in progress) with coordinates. */
  onSite: TimesheetRow[];
  workerNames: Record<string, string>;
  siteNames: Record<string, string>;
}

export function LiveMap({ sites, onSite, workerNames, siteNames }: LiveMapProps) {
  const points: [number, number][] = [
    ...sites.map((s) => [s.lat, s.lng] as [number, number]),
    ...onSite
      .filter((e) => e.in_lat !== null && e.in_lng !== null)
      .map((e) => [e.in_lat as number, e.in_lng as number] as [number, number]),
  ];

  return (
    <FullscreenMapWrapper className="h-full w-full">
      <MapContainer
        center={[-34.928, 138.59]}
        zoom={11}
        className="z-0 h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <FitBounds points={points} maxZoom={13} />
        <SiteLabelVisibility />
        <FullscreenInvalidate />
        {sites.map((site) => (
          <Marker key={site.id} position={[site.lat, site.lng]} icon={siteIcon(site.name)}>
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
              icon={workerDotIcon}
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
    </FullscreenMapWrapper>
  );
}
