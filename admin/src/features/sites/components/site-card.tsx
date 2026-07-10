import { Link } from 'react-router';
import { Circle, MapContainer, TileLayer } from 'react-leaflet';

import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/lib/database.types';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';

interface SiteCardProps {
  site: Tables<'job_sites'>;
  certTypes: Tables<'cert_types'>[];
  taskCount: number;
}

export function SiteCard({ site, certTypes, taskCount }: SiteCardProps) {
  const requiredCerts = certTypes.filter((certType) =>
    site.required_cert_type_ids.includes(certType.id),
  );

  return (
    <Link
      to={`/app/sites/${site.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card outline-none transition-shadow hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="pointer-events-none h-32" aria-hidden>
        <MapContainer
          center={[site.lat, site.lng]}
          zoom={14}
          className="h-full w-full"
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          keyboard={false}
          attributionControl={false}
        >
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          <Circle
            center={[site.lat, site.lng]}
            radius={site.geofence_radius_m}
            pathOptions={{ color: '#0F766E', fillColor: '#0F766E', fillOpacity: 0.15, weight: 2 }}
          />
        </MapContainer>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="text-sm font-semibold group-hover:text-primary">{site.name}</h3>
          <p className="text-xs text-muted-foreground">{site.client_name}</p>
        </div>
        <p className="text-xs text-muted-foreground">{site.address}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {requiredCerts.map((certType) => (
            <Badge key={certType.id} variant="outline" className="text-[11px]">
              {certType.name}
            </Badge>
          ))}
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {taskCount} task{taskCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </Link>
  );
}
