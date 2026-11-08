/**
 * OpenFreeMap basemaps (no API key), one per app theme. `dark` is the closest to
 * the app's dark background; both share the same tiles, fonts and sprites.
 */
export const MAP_STYLE_URLS = {
  light: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;
