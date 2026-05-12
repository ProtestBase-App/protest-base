/**
 * Barrel re-export for all MapLibre components used in the app.
 *
 * All imports here are static `import` statements so Metro resolves
 * them to the **same** module entry point. EventDetailed.tsx
 * dynamically `require`s this file (instead of requiring
 * @maplibre/maplibre-react-native directly) to avoid the
 * "Tried to register two views with the same name" error
 * that occurs when CJS `require` and ESM `import` resolve to
 * different entry points of the same package.
 */
export { MapView, Camera } from '@maplibre/maplibre-react-native';
export { MapMarker } from '@/components/MapMarker';
