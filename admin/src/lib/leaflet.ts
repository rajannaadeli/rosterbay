import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Bundlers break Leaflet's default marker asset resolution; point it at the
// Vite-emitted URLs once, before any map renders.
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

/**
 * CartoDB basemaps — Positron in light, Dark Matter in dark. Both are free
 * and keyless, and both are muted enough that the teal geofences and the
 * status-coloured dots stay the loudest thing on the map, which the default
 * OSM skin (green parks, brown roads, blue water) never allowed.
 *
 * Retina tiles: `{r}` resolves to "@2x" on high-DPI screens.
 */
export const TILE_URL = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
} as const;

export const OSM_ATTRIBUTION =
  '&copy; OpenStreetMap contributors &copy; CARTO';

/** @deprecated Use `useTileUrl()` so the basemap follows the theme. */
export const OSM_TILE_URL = TILE_URL.light;

/** Adelaide CBD — default pin position for a brand-new site. */
export const ADELAIDE_CENTER = { lat: -34.9285, lng: 138.6007 };
