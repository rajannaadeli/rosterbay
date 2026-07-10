import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Bundlers break Leaflet's default marker asset resolution; point it at the
// Vite-emitted URLs once, before any map renders.
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';

/** Adelaide CBD — default pin position for a brand-new site. */
export const ADELAIDE_CENTER = { lat: -34.9285, lng: 138.6007 };
