import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Bundlers break Leaflet's default marker asset resolution; point it at the
// Vite-emitted URLs once, before any map renders.
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

/**
 * Esri Gray Canvas — Light in light, Dark in dark. Free, keyless, and muted
 * enough that the teal geofences and the status-coloured dots stay the
 * loudest thing on the map, which the default OSM skin (green parks, brown
 * roads, blue water) never allowed.
 *
 * This replaced CartoDB Positron / Dark Matter, which were the obvious choice
 * until CARTO started stamping a diagonal "API KEY REQUIRED" watermark across
 * every tile served without a key. There is no URL that avoids it — the
 * watermark is rendered into the tile itself — so the only fixes are to pay
 * for a key or to change provider. Esri's Canvas basemaps are the closest
 * free match to the Positron look.
 *
 * Two layers, not one: Esri serves the streets and the place labels
 * separately, so `MapTiles` stacks Reference over Base. That is also an
 * improvement here — the label layer can be dropped on the small site-card
 * thumbnails, where basemap text only competes with our own site markers.
 *
 * Note the {z}/{y}/{x} order, which is Esri's, not the {z}/{x}/{y} every
 * other provider uses, and the absent file extension.
 */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';

export const TILE_URL = {
  light: `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  dark: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
} as const;

/** Place names and road labels, drawn over the base layer. */
export const TILE_LABEL_URL = {
  light: `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  dark: `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
} as const;

/**
 * Required by Esri's terms of use for the free Canvas basemaps, and by ODbL
 * for the OpenStreetMap data underneath. This is attribution, not a
 * watermark — it stays.
 */
export const OSM_ATTRIBUTION =
  '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

/** @deprecated Use `MapTiles` so the basemap follows the theme. */
export const OSM_TILE_URL = TILE_URL.light;

/** Adelaide CBD — default pin position for a brand-new site. */
export const ADELAIDE_CENTER = { lat: -34.9285, lng: 138.6007 };
