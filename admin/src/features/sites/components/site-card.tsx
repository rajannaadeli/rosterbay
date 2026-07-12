import { MapPin } from '@phosphor-icons/react';
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet';

import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/lib/database.types';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';
import { GEOFENCE_PATH_OPTIONS, siteIcon } from '@/lib/map-markers';

interface SiteCardProps {
  site: Tables<'job_sites'>;
  certTypes: Tables<'cert_types'>[];
  taskCount: number;
  onOpen: () => void;
}

export function SiteCard({ site, certTypes, taskCount, onOpen }: SiteCardProps) {
  const requiredCerts = certTypes.filter((ct) => site.required_cert_type_ids.includes(ct.id));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-lg border bg-card p-3 text-left outline-none transition-all hover:border-primary/40 hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold group-hover:text-primary">{site.name}</h3>
          <p className="truncate text-xs text-muted-foreground">{site.client_name}</p>
          <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin size={13} className="mt-px shrink-0" aria-hidden />
            <span className="truncate">{site.address}</span>
          </p>
        </div>
        {/* Compact, non-interactive mini-map thumbnail. */}
        <div className="pointer-events-none size-24 shrink-0 overflow-hidden rounded-lg border">
          <MapContainer
            center={[site.lat, site.lng]}
            zoom={14}
            className="z-0 h-full w-full"
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            keyboard={false}
            attributionControl={false}
          >
            <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
            <Circle center={[site.lat, site.lng]} radius={site.geofence_radius_m} pathOptions={GEOFENCE_PATH_OPTIONS} />
            <Marker position={[site.lat, site.lng]} icon={siteIcon(site.name)} />
          </MapContainer>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t pt-2.5">
        {requiredCerts.map((ct) => (
          <Badge key={ct.id} variant="outline" className="text-[11px]">
            {ct.name}
          </Badge>
        ))}
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <span>
            {taskCount} task{taskCount === 1 ? '' : 's'}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5">{site.geofence_radius_m} m</span>
        </span>
      </div>
    </button>
  );
}
