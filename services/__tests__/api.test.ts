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
        // Captured into API_KEY at api.ts module load.
        apiKey: 'test-api-key',
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

// The app language, which api.ts reads on every request for Accept-Language.
const mockGetCurrentLocale = jest.fn(() => 'en');
jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  getCurrentLocale: () => mockGetCurrentLocale(),
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
import { FORCE_LOGOUT_CODES, markSessionActive, setTokenExpirationCallback } from '@/services/api';

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
    // The one-shot sign-out guard is module state: re-arm it as a fresh login would.
    markSessionActive();
    jest.useRealTimers();
    mockGetCurrentLocale.mockReset();
    mockGetCurrentLocale.mockReturnValue('en');
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

    it('attaches X-App-Version even on the /app/config bootstrap path', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const config = { headers: {}, method: 'get', url: '/app/config' };
      const result = await getStore().requestFulfilled(config);

      expect(result.headers['X-App-Version']).toBe('1.2.3');
    });

    it('attaches x-api-key to API requests', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const config = { headers: {}, method: 'get', url: '/events' };
      const result = await getStore().requestFulfilled(config);

      expect(result.headers['x-api-key']).toBe('test-api-key');
      expect(result.headers['X-Install-Token']).toBeUndefined();
    });

    it('does not attach x-api-key to the credential-free /app/config bootstrap', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      for (const url of ['/app/config', '/app/config?platform=ios']) {
        const result = await getStore().requestFulfilled({ headers: {}, method: 'get', url });
        expect(result.headers['x-api-key']).toBeUndefined();
      }
    });

    it('attaches Accept-Language with the app language, read on every request', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockGetCurrentLocale.mockReturnValue('fr');

      const login = await getStore().requestFulfilled({
        headers: {},
        method: 'post',
        url: '/auth/login',
      });
      expect(login.headers['Accept-Language']).toBe('fr');

      // A language change applies to the very next request.
      mockGetCurrentLocale.mockReturnValue('nl');
      const next = await getStore().requestFulfilled({
        headers: {},
        method: 'get',
        url: '/events',
      });
      expect(next.headers['Accept-Language']).toBe('nl');
    });

    it('keeps an Accept-Language the caller set', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
      mockGetCurrentLocale.mockReturnValue('nl');

      const result = await getStore().requestFulfilled({
        headers: { 'Accept-Language': 'en' },
        method: 'get',
        url: '/events',
      });

      expect(result.headers['Accept-Language']).toBe('en');
    });

    it('still sends the request, without Accept-Language, when the language cannot be read', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
      mockGetCurrentLocale.mockImplementationOnce(() => {
        throw new Error('i18n not ready');
      });

      const result = await getStore().requestFulfilled({
        headers: {},
        method: 'get',
        url: '/events',
      });

      expect(result.headers['Accept-Language']).toBeUndefined();
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
      // The stored access token is the one the request carried, so nothing refreshed it yet.
      mockSecureStore.getItemAsync.mockImplementation(async (key: string) =>
        key === 'refresh_token' ? 'old-refresh-token' : key === 'access_token' ? 'old-token' : null
      );
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
      // The raw refresh call bypasses the request interceptor, so it must carry
      // the API key and the app language itself.
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.example.com/auth/token/refresh',
        { refreshToken: 'old-refresh-token' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
            'X-App-Version': '1.2.3',
            'Accept-Language': 'en',
          }),
          // A stalled refresh must not hold every queued request.
          timeout: 8000,
        })
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'access_token',
        'new-access-token',
        expect.any(Object)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh-token',
        expect.any(Object)
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

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'access_token',
        'new-access-token',
        expect.any(Object)
      );
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

      // Fail the refresh with an answer from the backend (a lost response is retried instead)
      rejectRefresh({ response: { status: 401, data: { code: 'INVALID_REFRESH_TOKEN' } } });

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
  // Refresh outcomes: 15-minute tokens, the 30 s rotation grace, disabled accounts
  // ============================================================
  describe('Response interceptor (rejected handler) - refresh outcomes', () => {
    const expiredError = (headers: Record<string, string> = {}) => ({
      config: { _retry: false, headers, method: 'get', url: '/protected' },
      response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
      message: 'Unauthorized',
    });
    const newTokens = {
      data: { data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' } },
    };
    const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

    beforeEach(() => {
      mockSecureStore.getItemAsync.mockImplementation(async (key: string) =>
        key === 'refresh_token' ? 'old-refresh-token' : null
      );
    });

    afterEach(() => {
      setTokenExpirationCallback(() => {});
    });

    it.each([
      ['ACCOUNT_DISABLED', 403, 'account_disabled'],
      ['TOKEN_REUSE_DETECTED', 401, 'token_reuse'],
      ['SESSION_REPLACED', 401, 'session_replaced'],
      ['REFRESH_TOKEN_EXPIRED', 401, undefined],
    ])(
      'signs out with the reason when the refresh is refused with %s',
      async (code, status, reason) => {
        const callback = jest.fn();
        setTokenExpirationCallback(callback);
        (mockAxios.post as jest.Mock).mockRejectedValueOnce({
          response: { status, data: { code } },
        });

        getStore().responseRejected(expiredError());
        await settle();

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(reason);
        // An answer from the backend is final: it is never retried.
        expect(mockAxios.post).toHaveBeenCalledTimes(1);
      }
    );

    it('retries a refresh lost in transit inside the rotation grace window', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      setTokenExpirationCallback(callback);
      (mockAxios.post as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(newTokens);
      getStore().retryFn.mockResolvedValueOnce({ data: { ok: true } });

      const result = getStore().responseRejected(expiredError());
      await jest.advanceTimersByTimeAsync(1000);

      await expect(result).resolves.toEqual({ data: { ok: true } });
      // The retry replays the same refresh token: within 30 s the backend answers with the
      // pair it already issued.
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect((mockAxios.post as jest.Mock).mock.calls[1][1]).toEqual({
        refreshToken: 'old-refresh-token',
      });
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'access_token',
        'new-access-token',
        expect.any(Object)
      );
      expect(callback).not.toHaveBeenCalled();
    });

    it('signs out once the transit retries are spent', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      setTokenExpirationCallback(callback);
      (mockAxios.post as jest.Mock).mockRejectedValue(new Error('Network Error'));

      getStore().responseRejected(expiredError());
      await jest.advanceTimersByTimeAsync(3000);

      expect(mockAxios.post).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it('never replays the refresh token once the grace window may have closed', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      setTokenExpirationCallback(callback);
      (mockAxios.post as jest.Mock).mockRejectedValue(new Error('Network Error'));

      getStore().responseRejected(expiredError());
      await jest.advanceTimersByTimeAsync(10);
      // Backgrounded during the 1 s wait: iOS fires the timer half a minute later.
      jest.setSystemTime(Date.now() + 30_000);
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it('keeps the session when the refresh is rate-limited, since nothing was rotated', async () => {
      const callback = jest.fn();
      setTokenExpirationCallback(callback);
      (mockAxios.post as jest.Mock).mockRejectedValueOnce({
        response: { status: 429, data: { code: 'RATE_LIMIT_EXCEEDED' } },
      });

      await expect(getStore().responseRejected(expiredError())).rejects.toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        isRateLimited: true,
      });
      expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
    });

    it('retries with the token a refresh already stored instead of rotating again', async () => {
      mockSecureStore.getItemAsync.mockImplementation(async (key: string) =>
        key === 'access_token' ? 'fresh-access-token' : 'old-refresh-token'
      );
      getStore().retryFn.mockResolvedValueOnce({ data: { ok: true } });
      const error = expiredError({ Authorization: 'Bearer stale-access-token' });

      await expect(getStore().responseRejected(error)).resolves.toEqual({ data: { ok: true } });
      expect(mockAxios.post).not.toHaveBeenCalled();
      expect(error.config.headers.Authorization).toBe('Bearer fresh-access-token');
    });
  });

  // ============================================================
  // Response interceptor - disabled account (403 ACCOUNT_DISABLED)
  // ============================================================
  describe('Response interceptor (rejected handler) - disabled account', () => {
    const disabledError = (headers: Record<string, string>) => ({
      config: { method: 'get', url: '/auth/user/info', headers },
      response: { status: 403, data: { code: 'ACCOUNT_DISABLED', error: 'Account is disabled' } },
      message: 'Forbidden',
    });
    const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

    afterEach(() => {
      setTokenExpirationCallback(() => {});
    });

    it('ends the session when an authenticated request finds the account disabled', async () => {
      const callback = jest.fn();
      setTokenExpirationCallback(callback);

      getStore().responseRejected(disabledError({ Authorization: 'Bearer access-token' }));
      await settle();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
      expect(callback).toHaveBeenCalledWith('account_disabled');
    });

    it('leaves a request without a token, such as the sign-in, to its own screen', async () => {
      const callback = jest.fn();
      setTokenExpirationCallback(callback);
      const error = disabledError({});

      await expect(getStore().responseRejected(error)).rejects.toBe(error);
      expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });

    it('reports a dying session once, however many requests fail together', async () => {
      const callback = jest.fn();
      setTokenExpirationCallback(callback);

      getStore().responseRejected(disabledError({ Authorization: 'Bearer access-token' }));
      getStore().responseRejected(disabledError({ Authorization: 'Bearer access-token' }));
      getStore().responseRejected({
        config: { method: 'get', url: '/organizations/my', headers: {} },
        response: { status: 401, data: { code: 'SESSION_INVALID' } },
        message: 'Unauthorized',
      });
      await settle();
      expect(callback).toHaveBeenCalledTimes(1);

      // The next session's end is reported again.
      markSessionActive();
      getStore().responseRejected(disabledError({ Authorization: 'Bearer access-token' }));
      await settle();
      expect(callback).toHaveBeenCalledTimes(2);
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

    it.each([
      'MFA_REQUIRED',
      'MFA_ENROLLMENT_REQUIRED',
      'MFA_CHALLENGE_INVALID',
      'INVALID_MFA_CODE',
      'MFA_LOCKED',
      'REAUTH_REQUIRED',
      'MFA_LAST_FACTOR_REQUIRED',
      'ACCOUNT_DISABLED',
    ])('never lists the login-security code %s', (code) => {
      expect(FORCE_LOGOUT_CODES).not.toContain(code);
    });

    it.each(['INVALID_MFA_CODE', 'MFA_CHALLENGE_INVALID'])(
      'passes a 401 %s through to the second-step screen',
      async (code) => {
        const tokenExpiredCallback = jest.fn();
        setTokenExpirationCallback(tokenExpiredCallback);
        const error = {
          config: { method: 'post', url: '/auth/mfa/verify', headers: {} },
          response: { status: 401, data: { code, attemptsRemaining: 3 } },
          message: 'Unauthorized',
        };

        await expect(getStore().responseRejected(error)).rejects.toBe(error);
        expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
        expect(tokenExpiredCallback).not.toHaveBeenCalled();

        setTokenExpirationCallback(() => {});
      }
    );

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
  // Response interceptor - API key rejections
  // ============================================================
  describe('Response interceptor (rejected handler) - API key rejections', () => {
    // The backend records a threat violation for each of these (3 per hour
    // bans the IP), so a replay would only speed up the ban.
    ['INVALID_API_KEY', 'INSTALL_TOKEN_MISSING'].forEach((code) => {
      it(`rejects 401 ${code} without retrying or touching the session`, async () => {
        const tokenExpiredCallback = jest.fn();
        setTokenExpirationCallback(tokenExpiredCallback);

        const error = {
          config: { headers: {}, method: 'get', url: '/events' },
          response: { status: 401, data: { code } },
          message: 'Unauthorized',
        };

        await expect(getStore().responseRejected(error)).rejects.toEqual(error);

        expect(getStore().retryFn).not.toHaveBeenCalled();
        expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
        expect(tokenExpiredCallback).not.toHaveBeenCalled();

        setTokenExpirationCallback(() => {});
      });
    });

    it('rejects a code-less 403 (banned IP) without retrying', async () => {
      const error = {
        config: { headers: {}, method: 'get', url: '/events' },
        response: { status: 403, data: { success: false, error: 'Forbidden' } },
        message: 'Forbidden',
      };

      await expect(getStore().responseRejected(error)).rejects.toEqual(error);

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

    it('preserves the ACCOUNT_LOCKED code instead of collapsing it to RATE_LIMIT_EXCEEDED', async () => {
      const error = {
        config: { method: 'post', url: '/auth/login', headers: {} },
        response: { status: 429, data: { code: 'ACCOUNT_LOCKED', error: 'Account locked' } },
        message: 'Too Many Requests',
      };

      await expect(getStore().responseRejected(error)).rejects.toMatchObject({
        code: 'ACCOUNT_LOCKED',
        isRateLimited: true,
      });
    });

    it('keeps MFA_LOCKED and the wait the backend sends with it', async () => {
      const error = {
        config: { method: 'post', url: '/auth/mfa/verify', headers: {} },
        response: { status: 429, data: { code: 'MFA_LOCKED', retryAfter: 900 } },
        message: 'Too Many Requests',
      };

      await expect(getStore().responseRejected(error)).rejects.toMatchObject({
        code: 'MFA_LOCKED',
        isRateLimited: true,
        retryAfter: 900,
      });
    });

    it('reads the wait from the Retry-After header when the body has none', async () => {
      const error = {
        config: { method: 'get', url: '/events', headers: {} },
        response: { status: 429, data: {}, headers: { 'retry-after': '120' } },
        message: 'Too Many Requests',
      };

      await expect(getStore().responseRejected(error)).rejects.toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 120,
      });
    });

    it('handles ACCOUNT_LOCKED even when the backend ships it as 403', async () => {
      const error = {
        config: { method: 'post', url: '/auth/login', headers: {} },
        response: { status: 403, data: { code: 'ACCOUNT_LOCKED', error: 'Account locked' } },
        message: 'Forbidden',
      };

      await expect(getStore().responseRejected(error)).rejects.toMatchObject({
        code: 'ACCOUNT_LOCKED',
        isRateLimited: true,
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
