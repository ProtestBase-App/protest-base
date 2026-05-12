/**
 * Returns the installed app's semantic version string, or `null` when no
 * version source is available.
 *
 * Expo Go reports its own version (typically 50.x.x or higher) via
 * Application.nativeApplicationVersion, which is not the app's version, so we
 * fall back to Constants.expoConfig?.version when we detect that case.
 *
 * Memoized — the version doesn't change at runtime.
 */
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import semverValid from 'semver/functions/valid';
import semverMajor from 'semver/functions/major';

let cached: string | null | undefined;

export function getInstalledAppVersion(): string | null {
  if (cached !== undefined) return cached;

  const expoVersion = Constants.expoConfig?.version;
  const nativeVersion = Application.nativeApplicationVersion;

  const isExpoGo =
    nativeVersion &&
    expoVersion &&
    semverValid(nativeVersion) &&
    semverValid(expoVersion) &&
    semverMajor(nativeVersion) > 50;

  if (isExpoGo && expoVersion) {
    cached = expoVersion;
    return cached;
  }

  cached = nativeVersion || expoVersion || null;
  return cached;
}

/** Test-only: clears the memoized value so each test reads the mocked state. */
export function __resetAppVersionCacheForTests(): void {
  cached = undefined;
}
