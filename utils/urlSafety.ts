/**
 * Safe external-URL opening.
 *
 * Threat model: several URLs handed to `Linking.openURL` originate from the
 * network and are attacker-influenceable:
 *   - the app-update / store URL comes from the anonymous, integrity-exempt
 *     `/app/config` response (a MITM on a hostile network can tamper with it
 *     and pair it with `forceUpdate: true` to drive a blocking "Update" screen);
 *   - an organizer's `website_url` is free-form data set by a (potentially
 *     malicious) organizer and shown to every other user.
 *
 * `Linking.openURL` will dispatch ANY scheme the device can handle — `tel:`,
 * `sms:`, `mailto:`, `intent://`, custom app schemes, etc. — so passing an
 * unvalidated value lets a remote/MITM attacker trigger arbitrary scheme
 * handling or redirect a forced-update tap to a phishing page. These helpers
 * constrain what may be opened.
 */

// React Native needs the polyfill for a spec-compliant URL parser; Node (tests)
// has a native URL. Mirrors the guard in utils/deepLinkValidation.ts.
if (typeof jest === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-url-polyfill/auto');
}

import { Linking } from 'react-native';
import { logger } from '@/utils/logger';

function parseUrl(url: string): URL | null {
  try {
    return new URL(url.trim());
  } catch {
    return null;
  }
}

/**
 * True only for plain http(s) links. Rejects every other scheme (javascript:,
 * data:, file:, tel:, custom app schemes, intent://, …). Use for free-form
 * external URLs (e.g. an organizer-supplied website) where any web page is
 * legitimate but a non-web scheme is not.
 */
export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}

/**
 * True only for URLs that can open an app store and cannot be used to phish:
 *   - https on a known store host (App Store / Play Store), or
 *   - a store-app scheme (market:, itms-apps:, itms-appss:) which the OS routes
 *     to the store app, never a browser.
 *
 * Used for the server-supplied update URL so a tampered `/app/config` cannot
 * point a forced-update tap at an arbitrary `https://evil.example` page.
 */
export function isAllowedStoreUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;

  const storeSchemes = ['market:', 'itms-apps:', 'itms-appss:'];
  if (storeSchemes.includes(parsed.protocol.toLowerCase())) {
    return true;
  }

  if (parsed.protocol.toLowerCase() === 'https:') {
    const host = parsed.hostname.toLowerCase();
    const allowedHosts = ['apps.apple.com', 'itunes.apple.com', 'play.google.com'];
    return allowedHosts.includes(host);
  }

  return false;
}

/**
 * Opens an externally-supplied URL only when it is a plain http(s) link.
 * Returns true if an open was attempted. Logs and no-ops otherwise.
 */
export async function openExternalUrlSafely(
  url: string | null | undefined,
  context?: string
): Promise<boolean> {
  if (!isSafeHttpUrl(url)) {
    logger.warn('[urlSafety] Refused to open non-http(s) URL', {
      context,
      url: typeof url === 'string' ? url.slice(0, 100) : String(url),
    });
    return false;
  }
  try {
    await Linking.openURL(url as string);
    return true;
  } catch (error) {
    logger.warn('[urlSafety] Failed to open external URL', {
      context,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Opens an app-store URL only when it passes `isAllowedStoreUrl`. Returns true
 * if an open was attempted. Logs and no-ops otherwise.
 */
export async function openStoreUrlSafely(
  url: string | null | undefined,
  context?: string
): Promise<boolean> {
  if (!isAllowedStoreUrl(url)) {
    logger.warn('[urlSafety] Refused to open non-store update URL', {
      context,
      url: typeof url === 'string' ? url.slice(0, 100) : String(url),
    });
    return false;
  }
  try {
    await Linking.openURL(url as string);
    return true;
  } catch (error) {
    logger.warn('[urlSafety] Failed to open store URL', {
      context,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
