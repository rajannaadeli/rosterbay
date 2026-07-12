import type { Marker as LeafletMarker } from 'leaflet';
import { useEffect } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';
import { draggablePinIcon, GEOFENCE_PATH_OPTIONS } from '@/lib/map-markers';

interface GeofenceValue {
  lat: number;
  lng: number;
  radius: number;
}

interface GeofenceEditorProps {
  value: GeofenceValue;
  onChange: (value: GeofenceValue) => void;
  siteName?: string;
  height?: number;
}

/** Keeps the pin comfortably in frame (padded) when it moves from outside. */
function KeepPinInView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    const padded = map.getBounds().pad(-0.25);
    if (!padded.contains([lat, lng])) map.panTo([lat, lng]);
  }, [map, lat, lng]);
  return null;
}

export function GeofenceEditor({ value, onChange, siteName = '', height = 240 }: GeofenceEditorProps) {
  return (
    <div className="z-0 flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border" style={{ height }}>
        <MapContainer center={[value.lat, value.lng]} zoom={15} className="z-0 h-full w-full">
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          <Marker
            position={[value.lat, value.lng]}
            draggable
            icon={draggablePinIcon(siteName)}
            eventHandlers={{
              dragend: (event) => {
                const next = (event.target as LeafletMarker).getLatLng();
                onChange({ ...value, lat: next.lat, lng: next.lng });
              },
            }}
          />
          <Circle center={[value.lat, value.lng]} radius={value.radius} pathOptions={GEOFENCE_PATH_OPTIONS} />
          <KeepPinInView lat={value.lat} lng={value.lng} />
        </MapContainer>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor="geofence-radius" className="shrink-0 text-xs text-muted-foreground">
          Geofence
        </Label>
        <Slider
          id="geofence-radius"
          min={50}
          max={500}
          step={10}
          value={value.radius}
          onValueChange={(next) => {
            const radius = Array.isArray(next) ? (next[0] ?? value.radius) : next;
            onChange({ ...value, radius });
          }}
          className="flex-1"
        />
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={50}
            max={500}
            step={10}
            aria-label="Geofence radius in metres"
            value={value.radius}
            onChange={(event) => {
              const raw = Number(event.target.value);
              if (Number.isFinite(raw)) {
                onChange({ ...value, radius: Math.min(500, Math.max(50, Math.round(raw))) });
              }
            }}
            className="h-8 w-16 text-right tabular-nums"
          />
          <span className="text-sm text-muted-foreground">m</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Drag the pin to the site entrance; the circle is the clock-in geofence (50–500 m).
      </p>
    </div>
  );
}
