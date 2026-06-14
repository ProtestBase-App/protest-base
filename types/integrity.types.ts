/**
 * Type definitions for the app integrity / install-token flow.
 *
 * This flow replaces the static `x-api-key` header with a per-install token
 * issued by the backend after verifying:
 *   - iOS: Apple App Attest attestation or assertion (via `@expo/app-integrity`).
 *   - Android: Hardware Key Attestation cert chain or ECDSA assertion (via the
 *     local `expo-hka` Expo module).
 * Non-production builds use a build-time bypass secret instead of running
 * native attestation.
 */

export type IntegrityPlatform = 'ios' | 'android' | 'bypass';

/**
 * - `pending`: attestation in flight (initial gate loader).
 * - `ready`: real attestation succeeded (production/preview) — sends X-Install-Token.
 * - `bypassed`: dev-bypass build — sends X-Dev-Integrity-Bypass.
 * - `fallback`: attestation could not complete on this device, so we fall open
 *   to legacy `x-api-key` auth instead of hard-blocking. The app renders
 *   normally. This is the production-incident safety net — no device is ever
 *   blocked at launch. See IntegrityProvider + services/api.ts.
 * - `failed`: hard block. Only reached via the dev-setup off-ramp
 *   (`missing_dev_secret` in development) or the fallback off-ramp, when the
 *   backend rejects the API-key fallback (e.g. the server kill-switch is off)
 *   and retrying would only earn threat violations.
 */
export type IntegrityStatus = 'pending' | 'ready' | 'bypassed' | 'fallback' | 'failed';

/**
 * Failure reasons surfaced from the integrity flow.
 *
 * - `unsupported_device`: covers both client capability checks
 *   (`Hka.isSupported() === false`, `AppIntegrity.isSupported === false`) and
 *   the backend `attest-version-unsupported` reason (Android 8 or earlier).
 * - `device_state_unsupported`: bootloader unlocked, cert revoked/expired,
 *   weak signature algorithm, device-id leak — anything indicating the device
 *   is in a state we won't accept. Backend reasons: verified-boot-untrusted,
 *   cert-revoked, cert-expired, weak-signature-algorithm, device-id-disclosed.
 * - `app_config_issue`: signing certificate mismatch, App Attest environment
 *   mismatch, package name mismatch. Backend reasons: apple-cert-invalid,
 *   app-id-mismatch, package-mismatch, app-unrecognized.
 * - `attestation_retryable`: transient device-keystore failure or auto-recovery
 *   that did not converge. User can retry. Backend reasons:
 *   android-keystore-invalid, invalid-payload, and the second-attempt failure
 *   of nonce-mismatch / unknown-key / signature-invalid / counter-replay.
 * - `attestation_failed`: catch-all when the backend reason is missing or
 *   unrecognized.
 * - `update_required`: not produced by the attestation flow itself. Set when a
 *   device running in `fallback` mode has its `x-api-key` request rejected by
 *   the backend (the server kill-switch was turned off). The user must update
 *   the app; retrying would only re-send a token-less request. See
 *   IntegrityProvider's fallback off-ramp.
 */
export type IntegrityFailureReason =
  | 'attestation_failed'
  | 'attestation_retryable'
  | 'device_state_unsupported'
  | 'app_config_issue'
  | 'nonce_failed'
  | 'network'
  | 'missing_dev_secret'
  | 'unsupported_platform'
  | 'unsupported_device'
  | 'update_required'
  | 'unknown';

export interface NonceResponse {
  nonce: string;
  expiresAt: number;
}

interface AttestRequestBase {
  nonce: string;
  /** APP_ENV at build time. Used by backend for bypass policy and telemetry. */
  environment?: 'development' | 'preview' | 'production';
}

/**
 * iOS App Attest payload.
 * - `attestation`: result of `attestKey()` on first run for this keyId. Backend
 *   verifies the Apple cert chain and stores the public key.
 * - `assertion`: result of `generateAssertion()` on subsequent runs. Backend
 *   verifies against the stored public key + sign-counter.
 */
export interface IosAttestRequest extends AttestRequestBase {
  platform: 'ios';
  /** App Attest key identifier returned by `generateKey()`. */
  keyId: string;
  mode: 'attestation' | 'assertion';
  /** Base64-encoded attestation object or assertion blob. */
  token: string;
}

/**
 * Android Hardware Key Attestation first-run payload.
 *
 * `keyId` is base64url(SHA-256(...)) — URL-safe, no padding — of the leaf
 * certificate's SubjectPublicKeyInfo DER (what the backend stores as the
 * public-key identifier, and can recompute from the leaf cert to confirm).
 * `certChain` is leaf-first, base64-DER, ≤10 entries, ≤4 KiB each.
 */
export interface AndroidAttestationRequest extends AttestRequestBase {
  platform: 'android';
  mode: 'attestation';
  keyId: string;
  certChain: string[];
}

/**
 * Android assertion payload — re-uses the keyId from the previous attestation.
 * `signature` is the base64-wrapped DER ECDSA signature over UTF-8(nonce).
 */
export interface AndroidAssertionRequest extends AttestRequestBase {
  platform: 'android';
  mode: 'assertion';
  keyId: string;
  signature: string;
}

/**
 * Non-production-only bypass. Backend honors this only when its own NODE_ENV
 * is non-production and the `X-Dev-Integrity-Bypass` header carries the
 * matching shared secret. `token` is the empty string for schema compatibility.
 */
export interface BypassAttestRequest extends AttestRequestBase {
  platform: 'bypass';
  token: string;
}

export type AttestRequest =
  | IosAttestRequest
  | AndroidAttestationRequest
  | AndroidAssertionRequest
  | BypassAttestRequest;

export interface InstallTokenResponse {
  installToken: string;
  expiresAt: number;
}
