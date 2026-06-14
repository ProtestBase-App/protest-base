// Mocks must be declared before any imports of the module under test.
// expo-constants is mocked with a stable object reference so individual tests
// can mutate `extra.appEnv` without re-importing the module under test.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        appEnv: 'development',
        devIntegrityBypass: 'test-dev-secret',
      },
    },
  },
}));

jest.mock('@expo/app-integrity', () => ({
  __esModule: true,
  isSupported: true,
  generateKeyAsync: jest.fn(),
  attestKeyAsync: jest.fn(),
  generateAssertionAsync: jest.fn(),
}));

jest.mock('@/modules/expo-hka/src', () => ({
  __esModule: true,
  isSupported: jest.fn(() => true),
  attest: jest.fn(),
  sign: jest.fn(),
  hasKey: jest.fn(() => false),
  clear: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  API_BASE_URL: 'http://test.local',
  getApiPrefix: () => '/api',
  setApiPrefix: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  __esModule: true,
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/utils/appVersion', () => ({
  __esModule: true,
  getInstalledAppVersion: jest.fn(() => '1.2.3'),
}));

const mockPost = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    isAxiosError: (e: unknown) => Boolean(e && (e as { isAxiosError?: boolean }).isAxiosError),
  },
}));

import * as SecureStore from 'expo-secure-store';
import * as AppIntegrity from '@expo/app-integrity';
import * as Hka from '@/modules/expo-hka/src';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  attestInstall,
  clearInstallToken,
  getInstallToken,
  isFallbackMode,
  setFallbackMode,
  IntegrityError,
  mapBackendReason,
} from '@/services/integrity.service';
import { SECURE_STORE_KEYS } from '@/constants/StorageConfig';
import { getInstalledAppVersion } from '@/utils/appVersion';

const mockGetInstalledAppVersion = getInstalledAppVersion as jest.Mock;

const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.Mock;

const mockGenerateKeyAsync = AppIntegrity.generateKeyAsync as jest.Mock;
const mockAttestKeyAsync = AppIntegrity.attestKeyAsync as jest.Mock;
const mockGenerateAssertionAsync = AppIntegrity.generateAssertionAsync as jest.Mock;

const mockHkaIsSupported = Hka.isSupported as jest.Mock;
const mockHkaAttest = Hka.attest as jest.Mock;
const mockHkaSign = Hka.sign as jest.Mock;
const mockHkaHasKey = Hka.hasKey as jest.Mock;
const mockHkaClear = Hka.clear as jest.Mock;

// Helpers for mutating the shared mock state per-test.
function setAppEnv(env: 'development' | 'preview' | 'production'): void {
  // Cast: the mock's `extra` is a plain object we control above.
  (Constants.expoConfig!.extra as Record<string, unknown>).appEnv = env;
}

function setPlatformOS(os: 'ios' | 'android' | 'web'): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

function setIsSupported(value: boolean): void {
  Object.defineProperty(AppIntegrity, 'isSupported', { value, configurable: true });
}

const NONCE_RESPONSE = {
  data: { success: true, data: { nonce: 'abc123', expiresAt: Date.now() + 60_000 } },
};

const installTokenResponse = (overrides: Record<string, unknown> = {}) => ({
  data: {
    success: true,
    data: {
      installToken: 'test-install-token',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      ...overrides,
    },
  },
});

describe('integrity.service', () => {
  beforeEach(() => {
    // Use resetAllMocks rather than clearAllMocks so leftover .mockResolvedValueOnce
    // queues from prior tests can't leak into the next test.
    jest.resetAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockDeleteItem.mockResolvedValue(undefined);
    mockGetInstalledAppVersion.mockReturnValue('1.2.3');
    // HKA defaults: supported, no key in keystore (forces attestation mode).
    mockHkaIsSupported.mockReturnValue(true);
    mockHkaHasKey.mockReturnValue(false);
    setAppEnv('development');
    setIsSupported(true);
    setPlatformOS('ios');
  });

  describe('getInstallToken — cached path', () => {
    it('returns the cached token when it is still valid', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INSTALL_TOKEN) return Promise.resolve('cached-token');
        if (key === SECURE_STORE_KEYS.INSTALL_TOKEN_EXPIRES_AT) {
          // 48h from now — comfortably outside the 24h proactive-refresh grace.
          return Promise.resolve(String(Date.now() + 48 * 60 * 60 * 1000));
        }
        return Promise.resolve(null);
      });

      const token = await getInstallToken();

      expect(token).toBe('cached-token');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('returns the cached token when it has just over 24h remaining', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INSTALL_TOKEN) return Promise.resolve('cached-token');
        if (key === SECURE_STORE_KEYS.INSTALL_TOKEN_EXPIRES_AT) {
          // 25h from now — just outside the grace window; must still be served from cache.
          return Promise.resolve(String(Date.now() + 25 * 60 * 60 * 1000));
        }
        return Promise.resolve(null);
      });

      const token = await getInstallToken();

      expect(token).toBe('cached-token');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('re-attests when the cached token is expired', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INSTALL_TOKEN) return Promise.resolve('expired-token');
        if (key === SECURE_STORE_KEYS.INSTALL_TOKEN_EXPIRES_AT) {
          return Promise.resolve(String(Date.now() - 1000));
        }
        return Promise.resolve(null);
      });
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      const token = await getInstallToken();

      expect(token).toBe('test-install-token');
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('re-attests when expiry is within the grace window', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INSTALL_TOKEN) return Promise.resolve('almost-expired');
        if (key === SECURE_STORE_KEYS.INSTALL_TOKEN_EXPIRES_AT) {
          // 12h from now — well inside the 24h grace window.
          return Promise.resolve(String(Date.now() + 12 * 60 * 60 * 1000));
        }
        return Promise.resolve(null);
      });
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      const token = await getInstallToken();

      expect(token).toBe('test-install-token');
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  describe('attestInstall — bypass path (non-prod)', () => {
    it('sends the bypass header and persists the returned token', async () => {
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockResolvedValueOnce(
          installTokenResponse({ installToken: 'new-token', expiresAt: 1234567 })
        );

      const result = await attestInstall();

      expect(result.installToken).toBe('new-token');

      // Second post call is to /auth/integrity/attest with the bypass header.
      const attestCall = mockPost.mock.calls[1];
      expect(attestCall[0]).toContain('/auth/integrity/attest');
      expect(attestCall[1]).toMatchObject({
        platform: 'bypass',
        nonce: 'abc123',
        token: '',
        environment: 'development',
      });
      expect(attestCall[2].headers['X-Dev-Integrity-Bypass']).toBe('test-dev-secret');
      expect(attestCall[2].headers['X-App-Version']).toBe('1.2.3');

      // First post call is to /auth/integrity/nonce — also carries X-App-Version.
      const nonceCall = mockPost.mock.calls[0];
      expect(nonceCall[0]).toContain('/auth/integrity/nonce');
      expect(nonceCall[2].headers['X-App-Version']).toBe('1.2.3');

      expect(mockSetItem).toHaveBeenCalledWith(
        SECURE_STORE_KEYS.INSTALL_TOKEN,
        'new-token',
        expect.any(Object)
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        SECURE_STORE_KEYS.INSTALL_TOKEN_EXPIRES_AT,
        '1234567',
        expect.any(Object)
      );
    });

    it('throws IntegrityError when nonce response has no data', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: false } });

      await expect(attestInstall()).rejects.toBeInstanceOf(IntegrityError);
    });

    it('throws IntegrityError when attest response has no token', async () => {
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockResolvedValueOnce({ data: { success: true, data: {} } });

      await expect(attestInstall()).rejects.toBeInstanceOf(IntegrityError);
    });

    it('flags network errors with reason "network"', async () => {
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockRejectedValueOnce({ isAxiosError: true, message: 'Network Error' });

      try {
        await attestInstall();
        fail('expected attestInstall to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrityError);
        expect((error as IntegrityError).reason).toBe('network');
      }
    });
  });

  describe('clearInstallToken', () => {
    it('removes both stored values', async () => {
      await clearInstallToken();

      expect(mockDeleteItem).toHaveBeenCalledWith(SECURE_STORE_KEYS.INSTALL_TOKEN);
      expect(mockDeleteItem).toHaveBeenCalledWith(SECURE_STORE_KEYS.INSTALL_TOKEN_EXPIRES_AT);
    });
  });

  describe('getInstallToken — concurrent callers', () => {
    it('deduplicates parallel attestations', async () => {
      // No cached token → both callers race into attestInstall.
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      const [a, b] = await Promise.all([getInstallToken(), getInstallToken()]);

      expect(a).toBe('test-install-token');
      expect(b).toBe('test-install-token');
      // Only one nonce + one attest pair, not two.
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  describe('attestInstall — iOS App Attest path', () => {
    beforeEach(() => {
      setAppEnv('preview');
      setPlatformOS('ios');
    });

    it('runs first-run attestation when no keyId is persisted', async () => {
      mockGetItem.mockImplementation((key: string) => {
        // Default: no install token, no keyId.
        if (key === SECURE_STORE_KEYS.INTEGRITY_KEY_ID) return Promise.resolve(null);
        return Promise.resolve(null);
      });
      mockGenerateKeyAsync.mockResolvedValue('new-key-id');
      mockAttestKeyAsync.mockResolvedValue('attestation-blob');
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      const result = await attestInstall();

      expect(result.installToken).toBe('test-install-token');
      expect(mockGenerateKeyAsync).toHaveBeenCalledTimes(1);
      expect(mockAttestKeyAsync).toHaveBeenCalledWith('new-key-id', 'abc123');
      expect(mockGenerateAssertionAsync).not.toHaveBeenCalled();
      expect(mockSetItem).toHaveBeenCalledWith(
        SECURE_STORE_KEYS.INTEGRITY_KEY_ID,
        'new-key-id',
        expect.any(Object)
      );

      const attestCall = mockPost.mock.calls[1];
      expect(attestCall[1]).toMatchObject({
        platform: 'ios',
        nonce: 'abc123',
        token: 'attestation-blob',
        keyId: 'new-key-id',
        mode: 'attestation',
        environment: 'preview',
      });
      // Bypass header must NOT be sent on real-attestation builds.
      expect(attestCall[2].headers['X-Dev-Integrity-Bypass']).toBeUndefined();
    });

    it('reuses persisted keyId for subsequent assertions', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INTEGRITY_KEY_ID) return Promise.resolve('existing-key');
        return Promise.resolve(null);
      });
      mockGenerateAssertionAsync.mockResolvedValue('assertion-blob');
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      await attestInstall();

      expect(mockGenerateKeyAsync).not.toHaveBeenCalled();
      expect(mockAttestKeyAsync).not.toHaveBeenCalled();
      expect(mockGenerateAssertionAsync).toHaveBeenCalledWith('existing-key', 'abc123');

      const attestCall = mockPost.mock.calls[1];
      expect(attestCall[1]).toMatchObject({
        platform: 'ios',
        token: 'assertion-blob',
        keyId: 'existing-key',
        mode: 'assertion',
      });
    });

    it('throws unsupported_device when isSupported is false', async () => {
      setIsSupported(false);
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE);

      try {
        await attestInstall();
        fail('expected attestInstall to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrityError);
        expect((error as IntegrityError).reason).toBe('unsupported_device');
      }
      expect(mockGenerateKeyAsync).not.toHaveBeenCalled();
    });

    it('maps native attestKey failures to attestation_failed', async () => {
      mockGenerateKeyAsync.mockResolvedValue('key');
      mockAttestKeyAsync.mockRejectedValue(new Error('apple says no'));
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE);

      try {
        await attestInstall();
        fail('expected attestInstall to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrityError);
        expect((error as IntegrityError).reason).toBe('attestation_failed');
      }
    });

    it('does not persist keyId when attestKey fails', async () => {
      mockGenerateKeyAsync.mockResolvedValue('key-doomed');
      mockAttestKeyAsync.mockRejectedValue(new Error('apple says no'));
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE);

      await expect(attestInstall()).rejects.toBeInstanceOf(IntegrityError);

      expect(mockSetItem).not.toHaveBeenCalledWith(
        SECURE_STORE_KEYS.INTEGRITY_KEY_ID,
        expect.any(String)
      );
    });

    it('does not persist keyId when backend rejects the attestation', async () => {
      mockGenerateKeyAsync.mockResolvedValue('key-rejected');
      mockAttestKeyAsync.mockResolvedValue('attestation-blob');
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockResolvedValueOnce({ data: { success: false, message: 'cert chain invalid' } });

      await expect(attestInstall()).rejects.toBeInstanceOf(IntegrityError);

      expect(mockSetItem).not.toHaveBeenCalledWith(
        SECURE_STORE_KEYS.INTEGRITY_KEY_ID,
        expect.any(String)
      );
    });
  });

  describe('attestInstall — Android Hardware Key Attestation path', () => {
    beforeEach(() => {
      setAppEnv('production');
      setPlatformOS('android');
    });

    it('runs first-run attestation when no keyId is persisted', async () => {
      mockHkaHasKey.mockReturnValue(false);
      mockHkaAttest.mockResolvedValue({
        keyId: 'spki-hash-leaf',
        certChain: ['cert-leaf-base64', 'cert-root-base64'],
      });
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      await attestInstall();

      expect(mockHkaAttest).toHaveBeenCalledWith('abc123');
      expect(mockHkaSign).not.toHaveBeenCalled();
      // keyId persisted only after backend ACK.
      expect(mockSetItem).toHaveBeenCalledWith(
        SECURE_STORE_KEYS.INTEGRITY_KEY_ID,
        'spki-hash-leaf',
        expect.any(Object)
      );

      const attestCall = mockPost.mock.calls[1];
      expect(attestCall[1]).toMatchObject({
        platform: 'android',
        nonce: 'abc123',
        mode: 'attestation',
        keyId: 'spki-hash-leaf',
        certChain: ['cert-leaf-base64', 'cert-root-base64'],
        environment: 'production',
      });
      expect(attestCall[2].headers['X-Dev-Integrity-Bypass']).toBeUndefined();
    });

    it('runs assertion when keyId is persisted AND keystore still holds the key', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INTEGRITY_KEY_ID) {
          return Promise.resolve('persisted-key-id');
        }
        return Promise.resolve(null);
      });
      mockHkaHasKey.mockReturnValue(true);
      mockHkaSign.mockResolvedValue('base64-der-sig');
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      await attestInstall();

      expect(mockHkaSign).toHaveBeenCalledWith('abc123');
      expect(mockHkaAttest).not.toHaveBeenCalled();

      const attestCall = mockPost.mock.calls[1];
      expect(attestCall[1]).toMatchObject({
        platform: 'android',
        nonce: 'abc123',
        mode: 'assertion',
        keyId: 'persisted-key-id',
        signature: 'base64-der-sig',
      });
    });

    it('falls back to attestation mode when keyId is persisted but keystore lost the key', async () => {
      // App-data clear, OS keystore reset, etc. — persisted keyId is stale.
      mockGetItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INTEGRITY_KEY_ID) return Promise.resolve('stale-key-id');
        return Promise.resolve(null);
      });
      mockHkaHasKey.mockReturnValue(false);
      mockHkaAttest.mockResolvedValue({
        keyId: 'fresh-key-id',
        certChain: ['cert'],
      });
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      await attestInstall();

      expect(mockHkaAttest).toHaveBeenCalled();
      expect(mockHkaSign).not.toHaveBeenCalled();
      // The fresh keyId replaces the stale one in SecureStore.
      expect(mockSetItem).toHaveBeenCalledWith(
        SECURE_STORE_KEYS.INTEGRITY_KEY_ID,
        'fresh-key-id',
        expect.any(Object)
      );
    });

    it('throws unsupported_device when Hka.isSupported() is false', async () => {
      mockHkaIsSupported.mockReturnValue(false);
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE);

      try {
        await attestInstall();
        fail('expected attestInstall to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrityError);
        expect((error as IntegrityError).reason).toBe('unsupported_device');
      }
      expect(mockHkaAttest).not.toHaveBeenCalled();
    });

    it('maps native HKA attestation failures to attestation_failed', async () => {
      mockHkaHasKey.mockReturnValue(false);
      mockHkaAttest.mockRejectedValue(new Error('keystore error'));
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE);

      try {
        await attestInstall();
        fail('expected attestInstall to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrityError);
        expect((error as IntegrityError).reason).toBe('attestation_failed');
      }
    });

    it('does not persist keyId when backend rejects the Android attestation', async () => {
      mockHkaHasKey.mockReturnValue(false);
      mockHkaAttest.mockResolvedValue({
        keyId: 'rejected-key-id',
        certChain: ['cert'],
      });
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockResolvedValueOnce({ data: { success: false, message: 'verified-boot-untrusted' } });

      await expect(attestInstall()).rejects.toBeInstanceOf(IntegrityError);

      expect(mockSetItem).not.toHaveBeenCalledWith(
        SECURE_STORE_KEYS.INTEGRITY_KEY_ID,
        expect.any(String)
      );
    });
  });

  describe('resolvePlatform — preview profile', () => {
    it('routes preview iOS builds to the real attestation path', async () => {
      setAppEnv('preview');
      setPlatformOS('ios');
      mockGenerateKeyAsync.mockResolvedValue('k');
      mockAttestKeyAsync.mockResolvedValue('t');
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      await attestInstall();

      const attestCall = mockPost.mock.calls[1];
      expect(attestCall[1].platform).toBe('ios');
      expect(attestCall[2].headers['X-Dev-Integrity-Bypass']).toBeUndefined();
    });

    it('routes preview Android builds to the real Hardware Key Attestation path', async () => {
      setAppEnv('preview');
      setPlatformOS('android');
      mockHkaHasKey.mockReturnValue(false);
      mockHkaAttest.mockResolvedValue({ keyId: 'k', certChain: ['c'] });
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      await attestInstall();

      const attestCall = mockPost.mock.calls[1];
      expect(attestCall[1].platform).toBe('android');
      expect(attestCall[1].mode).toBe('attestation');
      expect(attestCall[1].environment).toBe('preview');
      expect(attestCall[2].headers['X-Dev-Integrity-Bypass']).toBeUndefined();
      expect(mockHkaAttest).toHaveBeenCalled();
    });

    it('routes production Android builds to the real attestation path', async () => {
      setAppEnv('production');
      setPlatformOS('android');
      mockHkaHasKey.mockReturnValue(false);
      mockHkaAttest.mockResolvedValue({ keyId: 'k', certChain: ['c'] });
      mockPost.mockResolvedValueOnce(NONCE_RESPONSE).mockResolvedValueOnce(installTokenResponse());

      await attestInstall();

      const attestCall = mockPost.mock.calls[1];
      expect(attestCall[1].platform).toBe('android');
      expect(attestCall[2].headers['X-Dev-Integrity-Bypass']).toBeUndefined();
    });
  });

  describe('fallback mode', () => {
    // Module-level flag — reset after each test so it can't leak into others.
    afterEach(() => setFallbackMode(false));

    it('defaults to false', () => {
      expect(isFallbackMode()).toBe(false);
    });

    it('reflects setFallbackMode(true) / setFallbackMode(false)', () => {
      setFallbackMode(true);
      expect(isFallbackMode()).toBe(true);
      setFallbackMode(false);
      expect(isFallbackMode()).toBe(false);
    });
  });

  describe('mapBackendReason', () => {
    const cases: Array<[string, ReturnType<typeof mapBackendReason>]> = [
      ['attest-version-unsupported', 'unsupported_device'],
      ['verified-boot-untrusted', 'device_state_unsupported'],
      ['cert-revoked', 'device_state_unsupported'],
      ['cert-expired', 'device_state_unsupported'],
      ['weak-signature-algorithm', 'device_state_unsupported'],
      ['device-id-disclosed', 'device_state_unsupported'],
      ['apple-cert-invalid', 'app_config_issue'],
      ['app-id-mismatch', 'app_config_issue'],
      ['package-mismatch', 'app_config_issue'],
      ['app-unrecognized', 'app_config_issue'],
      ['android-keystore-invalid', 'attestation_retryable'],
      ['invalid-payload', 'attestation_retryable'],
      ['nonce-mismatch', 'attestation_retryable'],
      ['unknown-key', 'attestation_retryable'],
      ['signature-invalid', 'attestation_retryable'],
      ['counter-replay', 'attestation_retryable'],
    ];

    cases.forEach(([reason, expectedBucket]) => {
      it(`maps "${reason}" → ${expectedBucket}`, () => {
        expect(mapBackendReason(reason)).toBe(expectedBucket);
      });
    });

    it('falls back to attestation_failed for unknown reasons', () => {
      expect(mapBackendReason('some-future-reason-the-client-does-not-know')).toBe(
        'attestation_failed'
      );
    });

    it('falls back to attestation_failed when reason is undefined', () => {
      expect(mapBackendReason(undefined)).toBe('attestation_failed');
    });
  });

  describe('attestInstall — auto-recovery', () => {
    beforeEach(() => {
      setAppEnv('production');
      setPlatformOS('android');
      mockHkaHasKey.mockReturnValue(false);
      mockHkaAttest.mockResolvedValue({ keyId: 'attestation-keyid', certChain: ['cert'] });
    });

    function backendRejection(reason: string) {
      return {
        isAxiosError: true,
        response: {
          status: 401,
          data: { code: 'ATTESTATION_FAILED', reason },
        },
      };
    }

    it('auto-recovers via re-enroll on "unknown-key" and retries once with attestation', async () => {
      // Start in assertion mode (existing keyId persisted, keystore has key).
      mockGetItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INTEGRITY_KEY_ID) return Promise.resolve('stale-keyid');
        return Promise.resolve(null);
      });
      mockHkaHasKey.mockReturnValue(true);
      mockHkaSign.mockResolvedValue('sig');

      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE) // nonce #1
        .mockRejectedValueOnce(backendRejection('unknown-key')) // attest #1 fails
        .mockResolvedValueOnce(NONCE_RESPONSE) // nonce #2 (recovery)
        .mockResolvedValueOnce(installTokenResponse()); // attest #2 succeeds

      // After clearIntegrityKeyId, the next attestInstall pass reads no keyId
      // and the keystore reports no key, so it goes to attestation mode.
      let secureStoreDeleted = false;
      mockDeleteItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INTEGRITY_KEY_ID) secureStoreDeleted = true;
        return Promise.resolve(undefined);
      });
      mockGetItem.mockImplementation((key: string) => {
        if (key === SECURE_STORE_KEYS.INTEGRITY_KEY_ID) {
          return Promise.resolve(secureStoreDeleted ? null : 'stale-keyid');
        }
        return Promise.resolve(null);
      });
      mockHkaHasKey.mockImplementation(() => !secureStoreDeleted);

      const result = await attestInstall();

      expect(result.installToken).toBe('test-install-token');
      // Two nonces + two attests.
      expect(mockPost).toHaveBeenCalledTimes(4);
      // First attempt was assertion mode.
      expect(mockPost.mock.calls[1][1].mode).toBe('assertion');
      // Second attempt was attestation mode (post-recovery).
      expect(mockPost.mock.calls[3][1].mode).toBe('attestation');
    });

    it('auto-recovers on "nonce-mismatch" by restarting from /nonce', async () => {
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockRejectedValueOnce(backendRejection('nonce-mismatch'))
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockResolvedValueOnce(installTokenResponse());

      const result = await attestInstall();

      expect(result.installToken).toBe('test-install-token');
      expect(mockPost).toHaveBeenCalledTimes(4);
      // Both nonce requests were issued.
      expect(mockPost.mock.calls[0][0]).toContain('/auth/integrity/nonce');
      expect(mockPost.mock.calls[2][0]).toContain('/auth/integrity/nonce');
    });

    it('surfaces attestation_retryable when the second attempt also fails', async () => {
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockRejectedValueOnce(backendRejection('unknown-key'))
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockRejectedValueOnce(backendRejection('unknown-key'));

      try {
        await attestInstall();
        fail('expected attestInstall to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrityError);
        expect((error as IntegrityError).reason).toBe('attestation_retryable');
      }
      expect(mockPost).toHaveBeenCalledTimes(4);
    });

    it('surfaces device_state_unsupported without retrying on "verified-boot-untrusted"', async () => {
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockRejectedValueOnce(backendRejection('verified-boot-untrusted'));

      try {
        await attestInstall();
        fail('expected attestInstall to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrityError);
        expect((error as IntegrityError).reason).toBe('device_state_unsupported');
      }
      // No retry: only one nonce + one attest.
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('surfaces app_config_issue without retrying on "apple-cert-invalid"', async () => {
      setPlatformOS('ios');
      mockGenerateKeyAsync.mockResolvedValue('k');
      mockAttestKeyAsync.mockResolvedValue('t');
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockRejectedValueOnce(backendRejection('apple-cert-invalid'));

      try {
        await attestInstall();
        fail('expected attestInstall to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrityError);
        expect((error as IntegrityError).reason).toBe('app_config_issue');
      }
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('maps unknown backend reasons to attestation_failed', async () => {
      mockPost
        .mockResolvedValueOnce(NONCE_RESPONSE)
        .mockRejectedValueOnce(backendRejection('some-totally-new-reason'));

      try {
        await attestInstall();
        fail('expected attestInstall to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrityError);
        expect((error as IntegrityError).reason).toBe('attestation_failed');
      }
    });
  });
});
