import { Linking, Platform } from 'react-native';
import { logger } from '@/utils/logger';

const COOLDOWN_MS = 3000;
let isCooldown = false;

/**
 * Opens the device's native maps app with a location.
 *
 * Uses a module-level 3-second cooldown to prevent duplicate opens from rapid
 * taps (e.g., user double-tapping a location card or the sticky "Directions"
 * button). Shared across all call sites so multiple buttons pointing at the
 * same event don't both fire in quick succession.
 *
 * @param lat - Latitude (used as fallback if `address` is not provided)
 * @param lng - Longitude (used as fallback if `address` is not provided)
 * @param address - Optional full address string; produces a more precise
 *                  query than raw coordinates
 */
export function openMap(lat: number, lng: number, address?: string): void {
  if (isCooldown) return;

  const query = address ? encodeURIComponent(address) : `${lat},${lng}`;
  const url = Platform.select({
    ios: `maps:0,0?q=${query}`,
    android: `geo:0,0?q=${query}`,
  });

  if (url) {
    Linking.openURL(url).catch((err) => logger.error('Map open error', { error: err }));
  }

  isCooldown = true;
  setTimeout(() => {
    isCooldown = false;
  }, COOLDOWN_MS);
}

/**
 * Test-only helper to reset the cooldown between test runs.
 * Do not use in production code.
 */
export function __resetMapCooldownForTests(): void {
  isCooldown = false;
}
