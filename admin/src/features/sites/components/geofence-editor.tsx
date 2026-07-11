import type { Marker as LeafletMarker } from 'leaflet';
import { useEffect } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/leaflet';

interface GeofenceValue {
  lat: number;
  lng: number;
  radius: number;
}

interface GeofenceEditorProps {
  value: GeofenceValue;
  onChange: (value: GeofenceValue) => void;
}

/** Keeps the map framing the pin when the position changes from outside. */
function RecenterOnChange({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().contains([lat, lng])) {
      map.panTo([lat, lng]);
    }
  }, [map, lat, lng]);
  return null;
}

export function GeofenceEditor({ value, onChange }: GeofenceEditorProps) {
  return (
    <div className="flex flex-col gap-3 z-0">
      <div className="h-72 overflow-hidden rounded-lg border">
        <MapContainer center={[value.lat, value.lng]} zoom={15} className="h-full w-full">
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          <Marker
            position={[value.lat, value.lng]}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const next = (event.target as LeafletMarker).getLatLng();
                onChange({ ...value, lat: next.lat, lng: next.lng });
              },
            }}
          />
          <Circle
            center={[value.lat, value.lng]}
            radius={value.radius}
            pathOptions={{ color: '#0F766E', fillColor: '#0F766E', fillOpacity: 0.15, weight: 2 }}
          />
          <RecenterOnChange lat={value.lat} lng={value.lng} />
        </MapContainer>
      </div>

      <div className="flex items-center gap-4">
        <Label htmlFor="geofence-radius" className="shrink-0">
          Geofence radius
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
          className="max-w-xs"
        />
        <span className="w-14 text-right text-sm font-medium tabular-nums">{value.radius} m</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Drag the pin to the site entrance; the circle is the clock-in geofence (50–500 m).
      </p>
    </div>
  );
}
