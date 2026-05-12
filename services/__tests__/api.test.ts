// ============================================================
// api.ts test strategy:
//
// api.ts calls axios.create() at module load time and registers
// interceptors. To test the interceptor logic we:
// 1. Mock axios so create() returns a controlled instance
// 2. The interceptors.use() implementations store handler functions
//    into global.__apiTestStore__ which is initialized INSIDE the factory
//    (before any use() calls happen)
// 3. Tests access the stored handlers via getStore() helper
// ============================================================

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-constants', () => {
  const Constants = {
    expoConfig: {
      extra: {
        apiBaseUrl: 'https://api.example.com',
      },
    },
  };
  return {
    __esModule: true,
    default: Constants,
    ...Constants,
  };
});

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

// Mock the local HKA Expo module because the integrity service (loaded lazily
// by the api response interceptor) imports it; loading the real module would
// try to bind to a native Kotlin class that doesn't exist in Jest.
jest.mock('@/modules/expo-hka/src', () => ({
  __esModule: true,
  isSupported: jest.fn(() => false),
  attest: jest.fn(),
  sign: jest.fn(),
  hasKey: jest.fn(() => false),
  clear: jest.fn(),
}));

jest.mock('axios', () => {
  // Initialize global store inside factory (runs before interceptors are registered)
  (global as any).__apiTestStore__ = {
    requestFulfilled: null,
    requestRejected: null,
    responseFulfilled: null,
    responseRejected: null,
    retryFn: null,
  };

  const mockRetryFn = jest.fn();
  (global as any).__apiTestStore__.retryFn = mockRetryFn;

  const mockInstance = Object.assign(mockRetryFn, {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn((fulfilled: any, rejected: any) => {
          (global as any).__apiTestStore__.requestFulfilled = fulfilled;
          (global as any).__apiTestStore__.requestRejected = rejected;
        }),
      },
      response: {
        use: jest.fn((fulfilled: any, rejected: any) => {
          (global as any).__apiTestStore__.responseFulfilled = fulfilled;
          (global as any).__apiTestStore__.responseRejected = rejected;
        }),
      },
    },
    defaults: { headers: { common: {} } },
  });

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockInstance),
      post: jest.fn(),
      // utils/networkError.ts calls axios.isAxiosError; return false by default
      // so the tests' plain-object error fixtures take the non-network path
      // (logger.error, the pre-existing behaviour these tests were written for).
      isAxiosError: jest.fn(() => false),
    },
  };
});

// Import modules AFTER all mocks are declared
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { setTokenExpirationCallback } from '@/services/api';

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAxios = axios as jest.Mocked<typeof axios>;

const getStore = (): {
  requestFulfilled: (c: any) => Promise<any>;
  requestRejected: (e: any) => Promise<any>;
  responseFulfilled: (r: any) => any;
  responseRejected: (e: any) => Promise<any>;
  retryFn: jest.Mock;
} => (global as any).__apiTestStore__;

describe('services/api.ts', () => {
  afterEach(() => {
    mockSecureStore.getItemAsync.mockReset();
    mockSecureStore.setItemAsync.mockReset();
    mockSecureStore.deleteItemAsync.mockReset();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
    (mockAxios.post as jest.Mock).mockReset();
    getStore().retryFn?.mockReset();
  });

  // ============================================================
  // Module initialization
  // ============================================================
  describe('Module initialization', () => {
    it('calls axios.create once on module import', () => {
      expect(mockAxios.create).toHaveBeenCalledTimes(1);
    });

    it('creates instance with correct base configuration', () => {
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          timeout: 10000,
        })
      );
    });

    it('registers request interceptor with fulfilled and rejected handlers', () => {
      expect(getStore().requestFulfilled).toBeInstanceOf(Function);
      expect(getStore().requestRejected).toBeInstanceOf(Function);
    });

    it('registers response interceptor with fulfilled and rejected handlers', () => {
      expect(getStore().responseFulfilled).toBeInstanceOf(Function);
      expect(getStore().responseRejected).toBeInstanceOf(Function);
    });

    it('exports setTokenExpirationCallback as a named function', () => {
      expect(typeof setTokenExpirationCallback).toBe('function');
    });
  });

  // ============================================================
  // setTokenExpirationCallback
  // ============================================================
  describe('setTokenExpirationCallback', () => {
    it('accepts a callback without throwing', () => {
      expect(() => setTokenExpirationCallback(jest.fn())).not.toThrow();
    });

    it('can be replaced by calling again with a new callback', () => {
      expect(() => {
        setTokenExpirationCallback(jest.fn());
        setTokenExpirationCallback(jest.fn());
      }).not.toThrow();
    });
  });

  // ============================================================
  // Request interceptor - fulfilled handler
  // ============================================================
  describe('Request interceptor (fulfilled handler)', () => {
    it('injects Authorization header when token exists in SecureStore', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('my-access-token');

      const config = { headers: {}, method: 'get', url: '/test' };
      const result = await getStore().requestFulfilled(config);

      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('access_token');
      expect(result.headers.Authorization).toBe('Bearer my-access-token');
    });

    it('does not inject Authorization header when no token stored', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const config = { headers: {}, method: 'get', url: '/test' };
      const result = await getStore().requestFulfilled(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('returns the config object after processing', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const config = { headers: {}, method: 'post', url: '/auth/login' };
      const result = await getStore().requestFulfilled(config);

      expect(result).toBe(config);
    });

    it('attaches X-App-Version header from getInstalledAppVersion', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const config = { headers: {}, method: 'get', url: '/anything' };
      const result = await getStore().requestFulfilled(config);

      expect(result.headers['X-App-Version']).toBe('1.2.3');
    });

    it('attaches X-App-Version even on integrity-exempt bootstrap path', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const config = { headers: {}, method: 'get', url: '/app/config' };
      const result = await getStore().requestFulfilled(config);

      expect(result.headers['X-App-Version']).toBe('1.2.3');
    });

    it('omits X-App-Version when getInstalledAppVersion returns null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getInstalledAppVersion } = require('@/utils/appVersion');
      (getInstalledAppVersion as jest.Mock).mockReturnValueOnce(null);
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const config = { headers: {}, method: 'get', url: '/anything' };
      const result = await getStore().requestFulfilled(config);

      expect(result.headers['X-App-Version']).toBeUndefined();
    });
  });

  // ============================================================
  // Request interceptor - rejected handler
  // ============================================================
  describe('Request interceptor (rejected handler)', () => {
    it('rejects with the original error', async () => {
      const error = new Error('Request setup failed');
      await expect(getStore().requestRejected(error)).rejects.toThrow('Request setup failed');
    });
  });

  // ============================================================
  // Response interceptor - fulfilled handler
  // ============================================================
  describe('Response interceptor (fulfilled handler)', () => {
    it('passes response through unchanged', () => {
      const response = { data: { success: true }, status: 200 };
      expect(getStore().responseFulfilled(response)).toBe(response);
    });
  });

  // ============================================================
  // Response interceptor - TOKEN_EXPIRED refresh flow
  // ============================================================
  describe('Response interceptor (rejected handler) - TOKEN_EXPIRED', () => {
    it('attempts token refresh and retries the original request', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('old-refresh-token');
      (mockAxios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      });
      getStore().retryFn.mockResolvedValueOnce({ data: { success: true } });

      const originalRequest = {
        _retry: false,
        headers: { Authorization: 'Bearer old-token' },
        method: 'get',
        url: '/protected',
      };

      const error = {
        config: originalRequest,
        response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
        message: 'Unauthorized',
      };

      await getStore().responseRejected(error);

      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.example.com/auth/token/refresh',
        { refreshToken: 'old-refresh-token' },
        expect.any(Object)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'new-access-token');
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh-token'
      );
    });

    it('clears tokens and calls tokenExpirationCallback when no refresh token stored', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const tokenExpiredCallback = jest.fn();
      setTokenExpirationCallback(tokenExpiredCallback);

      const error = {
        config: { _retry: false, headers: {}, method: 'get', url: '/protected' },
        response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
        message: 'Unauthorized',
      };

      // Returns a never-settling promise to prevent error propagation
      getStore().responseRejected(error);

      // Wait for async side effects to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
      expect(tokenExpiredCallback).toHaveBeenCalled();

      setTokenExpirationCallback(() => {});
    });

    it('clears tokens and calls callback when refresh response has invalid token data', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('old-refresh-token');
      (mockAxios.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { refreshToken: 'some-token' } }, // missing accessToken
      });

      const tokenExpiredCallback = jest.fn();
      setTokenExpirationCallback(tokenExpiredCallback);

      const error = {
        config: { _retry: false, headers: {}, method: 'get', url: '/protected' },
        response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
        message: 'Unauthorized',
      };

      // Returns a never-settling promise to prevent error propagation
      getStore().responseRejected(error);

      // Wait for async side effects to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(tokenExpiredCallback).toHaveBeenCalled();

      setTokenExpirationCallback(() => {});
    });

    it('does not attempt refresh when _retry is already true', async () => {
      const error = {
        config: { _retry: true, headers: {}, method: 'get', url: '/protected' },
        response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
        message: 'Unauthorized',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);
      expect(mockSecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('queues concurrent requests while refresh is in progress and resolves them on success', async () => {
      // Set up: first request triggers a refresh (takes time), second request
      // arrives while first is still refreshing and gets queued.
      // This covers the processQueue(null, token) path (lines 51-54 in api.ts).

      let resolveRefresh!: (value: any) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      mockSecureStore.getItemAsync.mockResolvedValue('old-refresh-token');
      (mockAxios.post as jest.Mock).mockReturnValueOnce(refreshPromise);
      getStore().retryFn.mockResolvedValue({ data: { success: true } });

      const error1 = {
        config: { _retry: false, headers: {}, method: 'get', url: '/resource1' },
        response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
        message: 'Unauthorized',
      };

      const error2 = {
        config: { _retry: false, headers: {}, method: 'get', url: '/resource2' },
        response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
        message: 'Unauthorized',
      };

      // Start first request — this triggers the refresh flow and sets isRefreshing = true
      const promise1 = getStore().responseRejected(error1);

      // Start second request while refresh is in progress — should be queued
      const promise2 = getStore().responseRejected(error2);

      // Now resolve the refresh with valid tokens
      resolveRefresh({
        data: {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      });

      // Both requests should resolve successfully
      await Promise.all([promise1, promise2]);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'new-access-token');
    });

    it('clears tokens and invokes callback when refresh fails (never-settling promise)', async () => {
      // When refresh fails, the interceptor returns a never-settling promise
      // to prevent error propagation. Verify side effects instead.

      let rejectRefresh!: (error: any) => void;
      const refreshPromise = new Promise((_resolve, reject) => {
        rejectRefresh = reject;
      });

      mockSecureStore.getItemAsync.mockResolvedValue('old-refresh-token');
      (mockAxios.post as jest.Mock).mockReturnValueOnce(refreshPromise);

      const tokenExpiredCallback = jest.fn();
      setTokenExpirationCallback(tokenExpiredCallback);

      const error1 = {
        config: { _retry: false, headers: {}, method: 'get', url: '/resource1' },
        response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
        message: 'Unauthorized',
      };

      // Start the request — this triggers the refresh flow
      getStore().responseRejected(error1);

      // Fail the refresh
      rejectRefresh(new Error('Refresh failed'));

      // Wait for async side effects to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Tokens should be cleared and callback invoked
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
      expect(tokenExpiredCallback).toHaveBeenCalled();

      setTokenExpirationCallback(() => {});
    });
  });

  // ============================================================
  // Response interceptor - force logout codes
  // ============================================================
  describe('Response interceptor (rejected handler) - force logout codes', () => {
    const forceLogoutCodes = [
      'INVALID_TOKEN',
      'REFRESH_TOKEN_EXPIRED',
      'TOKEN_REUSE_DETECTED',
      'SESSION_INVALID',
    ];

    forceLogoutCodes.forEach((code) => {
      it(`clears tokens and invokes callback for error code: ${code}`, async () => {
        const tokenExpiredCallback = jest.fn();
        setTokenExpirationCallback(tokenExpiredCallback);

        const error = {
          config: { method: 'get', url: '/protected', headers: {} },
          response: { status: 401, data: { code } },
          message: 'Unauthorized',
        };

        // The interceptor returns a never-settling promise for force logout codes
        // to prevent error propagation. Fire and forget, then check side effects.
        getStore().responseRejected(error);

        // Wait for async side effects (deleteItemAsync) to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
        expect(tokenExpiredCallback).toHaveBeenCalled();

        setTokenExpirationCallback(() => {});
      });
    });

    it('does NOT clear tokens for an unknown 401 error code', async () => {
      const tokenExpiredCallback = jest.fn();
      setTokenExpirationCallback(tokenExpiredCallback);

      const error = {
        config: { method: 'get', url: '/protected', headers: {} },
        response: { status: 401, data: { code: 'SOME_UNKNOWN_CODE' } },
        message: 'Unauthorized',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);

      expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
      expect(tokenExpiredCallback).not.toHaveBeenCalled();

      setTokenExpirationCallback(() => {});
    });
  });

  // ============================================================
  // Response interceptor - install-token recovery (401 codes + 403 UNTRUSTED_INSTALL)
  // ============================================================
  describe('Response interceptor (rejected handler) - install-token recovery', () => {
    const integrityRetry401Codes = [
      'INSTALL_TOKEN_EXPIRED',
      'INSTALL_TOKEN_INVALID',
      'INSTALL_TOKEN_MISSING',
    ];

    integrityRetry401Codes.forEach((code) => {
      it(`clears the install token and retries once on 401 ${code}`, async () => {
        getStore().retryFn.mockResolvedValueOnce({ data: { success: true } });

        const originalRequest = { headers: {}, method: 'get', url: '/protected' } as Record<
          string,
          unknown
        >;
        const error = {
          config: originalRequest,
          response: { status: 401, data: { code } },
          message: 'Unauthorized',
        };

        await getStore().responseRejected(error);

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('install_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('install_token_expires_at');
        expect(getStore().retryFn).toHaveBeenCalledWith(originalRequest);
        expect(originalRequest._integrityRetry).toBe(true);
      });
    });

    it('clears the install token and retries once on 403 UNTRUSTED_INSTALL', async () => {
      getStore().retryFn.mockResolvedValueOnce({ data: { success: true } });

      const originalRequest = { headers: {}, method: 'post', url: '/events' } as Record<
        string,
        unknown
      >;
      const error = {
        config: originalRequest,
        response: { status: 403, data: { code: 'UNTRUSTED_INSTALL' } },
        message: 'Forbidden',
      };

      await getStore().responseRejected(error);

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('install_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('install_token_expires_at');
      expect(getStore().retryFn).toHaveBeenCalledWith(originalRequest);
      expect(originalRequest._integrityRetry).toBe(true);
    });

    it('does NOT retry a second time when the same code repeats after retry flag set', async () => {
      const originalRequest = {
        _integrityRetry: true,
        headers: {},
        method: 'get',
        url: '/protected',
      };
      const error = {
        config: originalRequest,
        response: { status: 401, data: { code: 'INSTALL_TOKEN_EXPIRED' } },
        message: 'Unauthorized',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);

      expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalledWith('install_token');
      expect(getStore().retryFn).not.toHaveBeenCalled();
    });

    it('does NOT retry repeated 403 UNTRUSTED_INSTALL after retry flag set', async () => {
      const originalRequest = {
        _integrityRetry: true,
        headers: {},
        method: 'post',
        url: '/events',
      };
      const error = {
        config: originalRequest,
        response: { status: 403, data: { code: 'UNTRUSTED_INSTALL' } },
        message: 'Forbidden',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);

      expect(getStore().retryFn).not.toHaveBeenCalled();
    });

    it('does NOT clear the install token for a generic 403 with no UNTRUSTED_INSTALL code', async () => {
      const error = {
        config: { headers: {}, method: 'delete', url: '/events/123' },
        response: { status: 403, data: { code: 'FORBIDDEN' } },
        message: 'Forbidden',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);

      expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalledWith('install_token');
      expect(getStore().retryFn).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Response interceptor - 429 rate limiting
  // ============================================================
  describe('Response interceptor (rejected handler) - 429 rate limiting', () => {
    it('creates rate limit error with code RATE_LIMIT_EXCEEDED for status 429', async () => {
      const error = {
        config: { method: 'post', url: '/events', headers: {} },
        response: { status: 429, data: { error: 'Rate limited' } },
        message: 'Too Many Requests',
      };

      await expect(getStore().responseRejected(error)).rejects.toMatchObject({
        message: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMIT_EXCEEDED',
        isRateLimited: true,
      });
    });

    it('creates rate limit error when response data code is RATE_LIMIT_EXCEEDED', async () => {
      const error = {
        config: { method: 'get', url: '/events', headers: {} },
        response: { status: 200, data: { code: 'RATE_LIMIT_EXCEEDED' } },
        message: 'Rate limited',
      };

      await expect(getStore().responseRejected(error)).rejects.toMatchObject({
        message: 'Too many requests. Please wait a moment and try again.',
        isRateLimited: true,
      });
    });

    it('preserves original error reference in the rate limit error', async () => {
      const originalError = {
        config: { method: 'get', url: '/events', headers: {} },
        response: { status: 429, data: {} },
        message: 'Too Many Requests',
      };

      await expect(getStore().responseRejected(originalError)).rejects.toMatchObject({
        originalError,
      });
    });
  });

  // ============================================================
  // Response interceptor - other errors pass-through
  // ============================================================
  describe('Response interceptor (rejected handler) - other errors pass-through', () => {
    it('re-throws 500 errors unchanged', async () => {
      const error = {
        config: { method: 'get', url: '/events', headers: {} },
        response: { status: 500, data: { error: 'Internal Server Error' } },
        message: 'Request failed',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);
    });

    it('re-throws network errors without a response property', async () => {
      const error = {
        config: { method: 'get', url: '/events', headers: {} },
        message: 'Network Error',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);
    });

    it('re-throws 403 errors unchanged', async () => {
      const error = {
        config: { method: 'delete', url: '/events/123', headers: {} },
        response: { status: 403, data: { error: 'Forbidden' } },
        message: 'Request failed',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);
    });

    it('re-throws 404 errors unchanged', async () => {
      const error = {
        config: { method: 'get', url: '/events/missing', headers: {} },
        response: { status: 404, data: { error: 'Not found' } },
        message: 'Request failed',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);
    });
  });
});
