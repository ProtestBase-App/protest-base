import { Platform } from 'react-native';

export interface HkaNativeModule {
  /** True only on Android with API level >= 28 (KeyMaster 4). */
  isSupported(): boolean;
  /**
   * Generate a fresh hardware-backed EC P-256 keypair under the given alias
   * with `setAttestationChallenge(utf8Bytes(nonce))`. Any pre-existing entry
   * under the alias is wiped first. Returns the leaf-first base64-DER cert
   * chain and the SPKI hash (lowercase hex) of the leaf certificate's public
   * key — both shapes the backend expects.
   */
  attest(alias: string, nonce: string): Promise<{ keyId: string; certChain: string[] }>;
  /**
   * Sign the UTF-8 bytes of `nonce` with the private key stored under `alias`,
   * using SHA-256 + ECDSA. Returns the JCA-default DER-encoded signature
   * base64-wrapped — matches the backend's assertion-mode contract.
   */
  sign(alias: string, nonce: string): Promise<string>;
  hasKey(alias: string): boolean;
  clear(alias: string): Promise<void>;
}

let cached: HkaNativeModule | null = null;
let attempted = false;

/**
 * Resolves the native ExpoHka module lazily.
 *
 * Returns `null` on iOS and web — the module is Android-only (see
 * `expo-module.config.json`), and calling `requireNativeModule('ExpoHka')` on
 * those platforms throws "Cannot find native module" at import time, which
 * would crash the whole app at startup. Callers must already platform-guard
 * before invoking native methods.
 */
export function getHkaNativeModule(): HkaNativeModule | null {
  if (attempted) return cached;
  attempted = true;
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const core = require('expo-modules-core') as {
      requireNativeModule: <T>(name: string) => T;
    };
    cached = core.requireNativeModule<HkaNativeModule>('ExpoHka');
  } catch {
    // Module wasn't linked (e.g. dev build run before `expo prebuild` picks it
    // up). Leave `cached` null; the index.ts wrappers return safe defaults.
    cached = null;
  }
  return cached;
}
