/**
 * Integrity service — manages the per-install token used to authenticate API
 * requests after the legacy `x-api-key` is retired.
 *
 * Build matrix (see isBypassMode for the authoritative gating):
 *   - production (iOS + Android): real App Attest / Hardware Key Attestation.
 *   - preview iOS: real App Attest (Apple's dev attestation environment works
 *     on direct-install builds, so we get end-to-end coverage in preview).
 *   - preview Android: real Hardware Key Attestation. Unlike Play Integrity,
 *     it does not require a Play Console install, so EAS internal distribution
 *     exercises the production path.
 *   - development (iOS + Android): bypass.
 *
 * Real path: a platform attestation payload is POSTed to /auth/integrity/attest,
 * which returns a 7-day install token persisted in SecureStore. On Android the
 * payload comes from the local `expo-hka` Expo module (Hardware Key
 * Attestation); on iOS it comes from `@expo/app-integrity` (App Attest).
 *
 * Bypass path: POSTs `platform: 'bypass'` together with the
 * `X-Dev-Integrity-Bypass` header. The backend honors this only when its own
 * NODE_ENV is non-production, so a leaked dev secret never grants access to
 * the production backend.
 *
 * The token is checked once at app start by IntegrityProvider, then attached
 * to every outgoing request by services/api.ts. Re-attestation runs
 * automatically when the backend returns INSTALL_TOKEN_EXPIRED (see api.ts
 * 401 handler).
 */

import axios from 'axios';
import * as AppIntegrity from '@expo/app-integrity';
import * as Hka from '@/modules/expo-hka/src';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';
import { SECURE_STORE_KEYS } from '@/constants/StorageConfig';
import { SECURE_STORE_OPTIONS } from '@/utils/secureStoreOptions';
import { API_BASE_URL, getApiPrefix } from '@/services/api';
import { getInstalledAppVersion } from '@/utils/appVersion';
import type {
  AttestRequest,
  IntegrityFailureReason,
  IntegrityPlatform,
  InstallTokenResponse,
  NonceResponse,
} from '@/types/integrity.types';

function getAppEnv(): 'development' | 'preview' | 'production' {
  return (
    (Constants.expoConfig?.extra?.appEnv as 'development' | 'preview' | 'production' | undefined) ||
    'development'
  );
}

function getDevBypassSecret(): string | undefined {
  return Constants.expoConfig?.extra?.devIntegrityBypass as string | undefined;
}

const ATTEST_PATH = '/auth/integrity/attest';
const NONCE_PATH = '/auth/integrity/nonce';

/**
 * Refresh the token proactively this long before its real expiry. Tokens are
 * issued for 7 days; refreshing in the last 24h gives us margin without
 * burning the rate-limited /attest endpoint with rotation-day spikes.
 */
const EXPIRY_GRACE_MS = 24 * 60 * 60 * 1000;

export class IntegrityError extends Error {
  reason: IntegrityFailureReason;
  constructor(reason: IntegrityFailureReason, message: string) {
    super(message);
    this.name = 'IntegrityError';
    this.reason = reason;
  }
}

/**
 * Coalesces concurrent callers so we never run two attestations in parallel.
 * Required because IntegrityProvider's initial check, the api.ts request
 * interceptor, and the 401 retry can all race on first launch.
 */
let inFlightAttest: Promise<string> | null = null;

export function isProductionBuild(): boolean {
  return getAppEnv() === 'production';
}

/**
 * True when this build runs the dev-bypass flow instead of real native
 * attestation. Bypass is used only for `development` builds on any platform.
 * Preview builds exercise the real attestation flow on both iOS (App Attest
 * dev environment) and Android (Hardware Key Attestation works on direct
 * installs — no Play Console requirement).
 */
export function isBypassMode(): boolean {
  return getAppEnv() === 'development';
}

/**
 * Returns a valid install token. Uses the cached one if present and unexpired,
 * otherwise runs the platform attestation flow (or the bypass flow on non-prod
 * builds) and persists the new token.
 */
export async function getInstallToken(): Promise<string> {
  const cached = await readCachedToken();
  if (cached) {
    return cached;
  }

  if (inFlightAttest) {
    return inFlightAttest;
  }

  inFlightAttest = attestInstall()
    .then((result) => result.installToken)
    .finally(() => {
      inFlightAttest = null;
    });

  return inFlightAttest;
}

/**
 * Forces a fresh attestation on the next getInstallToken() call. Invoked by
 * the api.ts response interceptor when the backend returns
 * INSTALL_TOKEN_EXPIRED so the next request transparently re-attests.
 */
export async function clearInstallToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_STORE_KEYS.INSTALL_TOKEN),
    SecureStore.deleteItemAsync(SECURE_STORE_KEYS.INSTALL_TOKEN_EXPIRES_AT),
  ]);
}

/**
 * Clears the persisted attestation-mode key identifier (iOS App Attest keyId
 * or Android SPKI-hash keyId). The next attestation will run a fresh
 * generateKey/attestKey (iOS) or Hka.attest (Android) cycle. On Android we
 * also wipe the Keystore entry so the next call regenerates the EC key with
 * a fresh attestation challenge — leaving a stale keypair behind would let
 * `hasKey()` still return true and route us into assertion mode.
 *
 * Use this when the backend rejects an assertion because it no longer has the
 * public key on record (e.g. server-side rotation, INTEGRITY_FAILURE reasons
 * like `unknown-key` / `signature-invalid` / `counter-replay`).
 */
export async function clearIntegrityKeyId(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.INTEGRITY_KEY_ID);
  if (Platform.OS === 'android' && Hka.isSupported()) {
    try {
      await Hka.clear();
    } catch (error) {
      logger.warn('[Integrity] Failed to clear Android HKA keystore entry', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function readCachedToken(): Promise<string | null> {
  try {
    const [token, expiresAtRaw] = await Promise.all([
      SecureStore.getItemAsync(SECURE_STORE_KEYS.INSTALL_TOKEN),
      SecureStore.getItemAsync(SECURE_STORE_KEYS.INSTALL_TOKEN_EXPIRES_AT),
    ]);

    if (!token || !expiresAtRaw) {
      return null;
    }

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt - EXPIRY_GRACE_MS <= Date.now()) {
      return null;
    }

    return token;
  } catch (error) {
    logger.warn('[Integrity] Failed to read cached install token', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function persistToken(response: InstallTokenResponse): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(
      SECURE_STORE_KEYS.INSTALL_TOKEN,
      response.installToken,
      SECURE_STORE_OPTIONS
    ),
    SecureStore.setItemAsync(
      SECURE_STORE_KEYS.INSTALL_TOKEN_EXPIRES_AT,
      String(response.expiresAt),
      SECURE_STORE_OPTIONS
    ),
  ]);
}

/**
 * Backend ATTESTATION_FAILED reasons that resolve by re-enrolling — drop the
 * cached keyId (iOS App Attest id or Android Keystore alias) and run a fresh
 * attestation-mode cycle. The current key/public-key pair on file is bad.
 */
const REENROLL_REASONS: ReadonlySet<string> = new Set([
  'unknown-key',
  'signature-invalid',
  'counter-replay',
]);

/**
 * Maps backend `data.reason` strings from /auth/integrity/attest (see
 * src/types/integrity.ts:72-88 on the backend) to the user-facing buckets
 * surfaced by IntegrityFailedScreen. Reasons that auto-recover internally
 * (REENROLL_REASONS + 'nonce-mismatch') only reach this mapper if the
 * second-attempt retry also fails — they bucket as `attestation_retryable`.
 */
export function mapBackendReason(reason: string | undefined): IntegrityFailureReason {
  switch (reason) {
    case 'attest-version-unsupported':
      return 'unsupported_device';
    case 'verified-boot-untrusted':
    case 'cert-revoked':
    case 'cert-expired':
    case 'weak-signature-algorithm':
    case 'device-id-disclosed':
      return 'device_state_unsupported';
    case 'apple-cert-invalid':
    case 'app-id-mismatch':
    case 'package-mismatch':
    case 'app-unrecognized':
      return 'app_config_issue';
    case 'android-keystore-invalid':
    case 'invalid-payload':
    case 'nonce-mismatch':
    case 'unknown-key':
    case 'signature-invalid':
    case 'counter-replay':
      return 'attestation_retryable';
    default:
      return 'attestation_failed';
  }
}

interface AttestError {
  response?: {
    status?: number;
    data?: { code?: string; reason?: string };
  };
}

function readAttestErrorDetails(error: unknown): { code?: string; reason?: string } {
  const data = (error as AttestError)?.response?.data;
  return { code: data?.code, reason: data?.reason };
}

/**
 * Runs the attestation flow end-to-end and persists the resulting install
 * token. Exported for tests; production callers should use getInstallToken().
 *
 * Auto-recovery: certain backend reasons (unknown-key / signature-invalid /
 * counter-replay / nonce-mismatch) are transparent to the caller — we drop
 * the relevant state and retry ONCE. Only the second-attempt failure surfaces
 * to the caller, tagged as `attestation_retryable`.
 */
export async function attestInstall(): Promise<InstallTokenResponse> {
  return attestInstallInternal(1);
}

async function attestInstallInternal(attempt: 1 | 2): Promise<InstallTokenResponse> {
  if (!API_BASE_URL) {
    throw new IntegrityError('unknown', 'API_BASE_URL is not configured');
  }

  const platform = resolvePlatform();
  const nonceResponse = await fetchNonce(platform);

  let attestPayload: AttestRequest;
  if (platform === 'bypass') {
    attestPayload = {
      platform: 'bypass',
      nonce: nonceResponse.nonce,
      token: '',
      environment: getAppEnv(),
    };
  } else {
    attestPayload = await buildPlatformPayload(platform, nonceResponse.nonce);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const appVersion = getInstalledAppVersion();
  if (appVersion) {
    headers['X-App-Version'] = appVersion;
  }
  if (platform === 'bypass') {
    const devSecret = getDevBypassSecret();
    if (!devSecret) {
      throw new IntegrityError(
        'missing_dev_secret',
        'EXPO_PUBLIC_DEV_INTEGRITY_BYPASS is not set. Add it to .env.local for local development.'
      );
    }
    headers['X-Dev-Integrity-Bypass'] = devSecret;
  }

  let response;
  try {
    response = await axios.post<{
      success: boolean;
      data?: InstallTokenResponse;
      message?: string;
    }>(`${API_BASE_URL}${getApiPrefix()}${ATTEST_PATH}`, attestPayload, {
      headers,
      timeout: 15000,
    });
  } catch (error) {
    if (isAxiosNetworkError(error)) {
      logger.warn('[Integrity] Attest network error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new IntegrityError('network', 'Failed to obtain install token');
    }

    const { code, reason } = readAttestErrorDetails(error);
    if (attempt === 1 && code === 'ATTESTATION_FAILED' && reason) {
      if (REENROLL_REASONS.has(reason)) {
        logger.info('[Integrity] Auto-recovering via re-enroll', { reason });
        await clearIntegrityKeyId();
        return attestInstallInternal(2);
      }
      if (reason === 'nonce-mismatch') {
        logger.info('[Integrity] Auto-recovering via nonce restart');
        return attestInstallInternal(2);
      }
    }

    const failureReason: IntegrityFailureReason =
      code === 'ATTESTATION_FAILED' ? mapBackendReason(reason) : 'attestation_failed';
    logger.warn('[Integrity] Attest request failed', {
      attempt,
      code,
      reason,
      failureReason,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new IntegrityError(failureReason, 'Failed to obtain install token');
  }

  const data = response.data?.data;
  if (!response.data?.success || !data?.installToken || !data?.expiresAt) {
    throw new IntegrityError('attestation_failed', 'Invalid attest response');
  }

  await persistToken(data);

  // Persist the attestation-mode keyId (iOS App Attest or Android HKA) only
  // after the backend has accepted the attestation and registered the public
  // key. This guarantees that any keyId we read on subsequent launches has a
  // matching record on the backend, so the next assertion can be verified.
  if (
    (attestPayload.platform === 'ios' || attestPayload.platform === 'android') &&
    attestPayload.mode === 'attestation'
  ) {
    await SecureStore.setItemAsync(
      SECURE_STORE_KEYS.INTEGRITY_KEY_ID,
      attestPayload.keyId,
      SECURE_STORE_OPTIONS
    );
  }

  logger.info('[Integrity] Install token issued', {
    platform,
    expiresAt: data.expiresAt,
  });
  return data;
}

function resolvePlatform(): IntegrityPlatform {
  // Bypass takes precedence — see isBypassMode for the criteria. After that,
  // the choice is purely by Platform.OS.
  if (isBypassMode()) {
    return 'bypass';
  }
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  throw new IntegrityError('unsupported_platform', `Unsupported platform: ${Platform.OS}`);
}

async function fetchNonce(platform: IntegrityPlatform): Promise<NonceResponse> {
  if (!API_BASE_URL) {
    throw new IntegrityError('unknown', 'API_BASE_URL is not configured');
  }
  try {
    const nonceHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    const nonceAppVersion = getInstalledAppVersion();
    if (nonceAppVersion) {
      nonceHeaders['X-App-Version'] = nonceAppVersion;
    }
    const response = await axios.post<{
      success: boolean;
      data?: NonceResponse;
    }>(
      `${API_BASE_URL}${getApiPrefix()}${NONCE_PATH}`,
      { platform },
      { headers: nonceHeaders, timeout: 10000 }
    );
    const nonce = response.data?.data;
    if (!response.data?.success || !nonce?.nonce || !nonce?.expiresAt) {
      throw new IntegrityError('nonce_failed', 'Invalid nonce response');
    }
    return nonce;
  } catch (error) {
    if (error instanceof IntegrityError) throw error;
    const reason: IntegrityFailureReason = isAxiosNetworkError(error) ? 'network' : 'nonce_failed';
    logger.warn('[Integrity] Nonce request failed', {
      reason,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new IntegrityError(reason, 'Failed to obtain integrity nonce');
  }
}

/**
 * Generates the platform attestation payload.
 *  - iOS: wraps `@expo/app-integrity`. First run does generateKey() +
 *    attestKey() and (after backend ACK) persists the Apple keyId; subsequent
 *    runs reuse the keyId with generateAssertion().
 *  - Android: wraps the local `expo-hka` module. First run generates a fresh
 *    EC P-256 key in the AndroidKeyStore with setAttestationChallenge(nonce)
 *    and emits the cert chain plus SPKI-hash keyId; subsequent runs sign the
 *    nonce bytes with the persisted key.
 *
 * Throws `IntegrityError` with a tagged reason on failure so the caller (and
 * the IntegrityProvider UI) can map to the right failure screen.
 */
async function buildPlatformPayload(
  platform: 'ios' | 'android',
  nonce: string
): Promise<AttestRequest> {
  if (platform === 'ios') {
    return buildIosPayload(nonce);
  }
  return buildAndroidPayload(nonce);
}

async function buildIosPayload(nonce: string): Promise<AttestRequest> {
  if (!AppIntegrity.isSupported) {
    throw new IntegrityError('unsupported_device', 'App Attest is not available on this device.');
  }

  const existingKeyId = await SecureStore.getItemAsync(SECURE_STORE_KEYS.INTEGRITY_KEY_ID);

  try {
    if (!existingKeyId) {
      // Important: do NOT persist the keyId here. We persist only after the
      // backend confirms it has registered the public key (see attestInstall).
      // If we persisted on success of attestKeyAsync alone and the subsequent
      // POST to /auth/integrity/attest failed, the next launch would assert
      // against a key the backend never recorded — a permanent failure until
      // SecureStore is wiped.
      const keyId = await AppIntegrity.generateKeyAsync();
      const token = await AppIntegrity.attestKeyAsync(keyId, nonce);
      return {
        platform: 'ios',
        nonce,
        token,
        keyId,
        mode: 'attestation',
        environment: getAppEnv(),
      };
    }

    const token = await AppIntegrity.generateAssertionAsync(existingKeyId, nonce);
    return {
      platform: 'ios',
      nonce,
      token,
      keyId: existingKeyId,
      mode: 'assertion',
      environment: getAppEnv(),
    };
  } catch (error) {
    logger.warn('[Integrity] iOS App Attest call failed', {
      error: error instanceof Error ? error.message : String(error),
      hadExistingKey: Boolean(existingKeyId),
    });
    throw new IntegrityError('attestation_failed', 'App Attest failed');
  }
}

async function buildAndroidPayload(nonce: string): Promise<AttestRequest> {
  if (!Hka.isSupported()) {
    throw new IntegrityError(
      'unsupported_device',
      'Hardware Key Attestation requires Android 9 (API 28) or higher.'
    );
  }

  const existingKeyId = await SecureStore.getItemAsync(SECURE_STORE_KEYS.INTEGRITY_KEY_ID);
  // Both halves of the assertion path must agree: the SecureStore-persisted
  // keyId AND a matching key in the AndroidKeyStore. App-data clears or
  // OS-level keystore resets can drop the keypair while leaving the keyId
  // behind, so check both before committing to assertion mode.
  const canAssert = existingKeyId !== null && Hka.hasKey();

  try {
    if (!canAssert) {
      // Do NOT persist keyId here — see the iOS comment above for why; the
      // backend ACK happens in attestInstall after this returns.
      const { keyId, certChain } = await Hka.attest(nonce);
      return {
        platform: 'android',
        nonce,
        mode: 'attestation',
        keyId,
        certChain,
        environment: getAppEnv(),
      };
    }

    const signature = await Hka.sign(nonce);
    return {
      platform: 'android',
      nonce,
      mode: 'assertion',
      keyId: existingKeyId as string,
      signature,
      environment: getAppEnv(),
    };
  } catch (error) {
    if (error instanceof IntegrityError) throw error;
    logger.warn('[Integrity] Android HKA call failed', {
      error: error instanceof Error ? error.message : String(error),
      hadExistingKey: canAssert,
    });
    throw new IntegrityError('attestation_failed', 'Hardware Key Attestation failed');
  }
}

function isAxiosNetworkError(error: unknown): boolean {
  if (!error) return false;
  if (axios.isAxiosError(error)) {
    return !error.response;
  }
  return false;
}
