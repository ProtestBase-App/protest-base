/**
 * Android Hardware Key Attestation — used by services/integrity.service.ts to
 * produce the install-token attestation payload that the backend's
 * `/auth/integrity/attest` endpoint accepts on Android.
 *
 * iOS continues to use `@expo/app-integrity`'s App Attest. This module is
 * Android-only; the helpers below return safe defaults / no-op on other
 * platforms so importing the module never crashes app startup.
 */
import { Platform } from 'react-native';
import { getHkaNativeModule } from './ExpoHkaModule';

export interface HkaAttestation {
  /** Lowercase hex SHA-256 of the leaf certificate's SubjectPublicKeyInfo DER. */
  keyId: string;
  /** Leaf-first, base64-DER, no line wrapping. */
  certChain: string[];
}

/**
 * Default keystore alias. Stable across app updates so existing installs
 * continue to resolve their attested key.
 */
export const DEFAULT_ALIAS = 'be.protestbase.app.integrity.hka';

export function isSupported(): boolean {
  if (Platform.OS !== 'android') return false;
  return getHkaNativeModule()?.isSupported() ?? false;
}

export function attest(nonce: string, alias: string = DEFAULT_ALIAS): Promise<HkaAttestation> {
  const native = getHkaNativeModule();
  if (!native) {
    return Promise.reject(new Error('ExpoHka native module is not available on this platform.'));
  }
  return native.attest(alias, nonce);
}

/** Returns the base64-wrapped DER ECDSA signature over UTF-8(nonce). */
export function sign(nonce: string, alias: string = DEFAULT_ALIAS): Promise<string> {
  const native = getHkaNativeModule();
  if (!native) {
    return Promise.reject(new Error('ExpoHka native module is not available on this platform.'));
  }
  return native.sign(alias, nonce);
}

export function hasKey(alias: string = DEFAULT_ALIAS): boolean {
  if (Platform.OS !== 'android') return false;
  return getHkaNativeModule()?.hasKey(alias) ?? false;
}

export function clear(alias: string = DEFAULT_ALIAS): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  const native = getHkaNativeModule();
  if (!native) return Promise.resolve();
  return native.clear(alias);
}
