/**
 * Barrel re-export for all MapLibre components used in the app.
 *
 * All imports here are static `import` statements so Metro resolves
 * them to the **same** module entry point. Consumers (EventDetailed.tsx,
 * the maps tab) dynamically `require` this file (instead of requiring
 * @maplibre/maplibre-react-native directly) so the library only loads
 * when its native modules exist — v11 calls
 * `TurboModuleRegistry.getEnforcing` at import time and throws otherwise
 * (e.g. in Expo Go or Jest).
 *
 * `Map` is re-exported as `MapLibreMap` so consumers don't shadow the
 * global `Map` constructor.
 */
export { Map as MapLibreMap, Camera, Marker } from '@maplibre/maplibre-react-native';
export { MapMarker } from '@/components/MapMarker';
