import axios from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * When true, the request interceptor will not attach the user's JWT.
     * Use for anonymous endpoints that must not be tied to a user account.
     */
    skipAuth?: boolean;
  }
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { logger } from '@/utils/logger';
import { SECURE_STORE_KEYS, STORAGE_KEYS } from '@/constants/StorageConfig';
import { SECURE_STORE_OPTIONS } from '@/utils/secureStoreOptions';
import { isNetworkError } from '@/utils/networkError';
import { getInstalledAppVersion } from '@/utils/appVersion';

// Mobile API key, sent as `x-api-key` on every request except the /app/config
// bootstrap. Trimmed so a stray newline in the EAS env var can't 401 every
// request — each of which the backend counts toward an IP ban.
const API_KEY = (
  ((Constants.expoConfig?.extra?.apiKey as string | undefined) ||
    process.env.EXPO_PUBLIC_API_KEY) ??
  ''
).trim();

interface RateLimitError extends Error {
  code: string;
  isRateLimited: boolean;
  originalError: unknown;
}

// Host only — no /api path. The prefix is discovered at runtime via /app/config.
export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL;

// Bootstrap path that must NEVER be prefixed — it's how we discover the prefix.
const BOOTSTRAP_PATH = '/app/config';

// Mutable runtime prefix. Defaults to empty string for old-backend / new-app combos.
let apiPrefix = '';
// Tracks whether setApiPrefix has been called this session, so the warm-start
// hydration below can't overwrite a freshly-set value if it loses the race.
let prefixExplicitlySet = false;

function normalizePrefix(prefix: string | null | undefined): string {
  let value = (prefix ?? '').trim();
  if (!value) return '';
  if (!value.startsWith('/')) value = `/${value}`;
  return value.replace(/\/+$/, '');
}

export async function setApiPrefix(prefix: string): Promise<void> {
  const normalized = normalizePrefix(prefix);
  apiPrefix = normalized;
  prefixExplicitlySet = true;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.API_PREFIX, normalized);
  } catch (error) {
    logger.warn('[API] Failed to persist apiPrefix', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Tracks whether a prefix from a previous launch was found in storage.
let prefixHydratedFromStorage = false;

// Best-effort warm-start hydration — loads persisted prefix before /app/config returns.
// VersionGate blocks most other API traffic until /app/config completes, but hydrating early
// is what lets the cold-start events fetch run alongside the bootstrap. The prefixExplicitlySet
// guard prevents an out-of-order resolution from overwriting a value just set by a fast
// bootstrap response.
export const apiPrefixReady: Promise<void> = (async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.API_PREFIX);
    if (stored !== null) {
      prefixHydratedFromStorage = true;
      if (!prefixExplicitlySet) {
        apiPrefix = normalizePrefix(stored);
      }
    }
  } catch {
    // best-effort; ignore
  }
})();

/**
 * True once the prefix is known — hydrated from a previous launch, or set by
 * /app/config this session. Callers that issue a request before the bootstrap
 * completes use this to tell a warm start (safe: reuse last launch's prefix)
 * from a first-ever launch (unknown path — wait for /app/config instead).
 * Await `apiPrefixReady` first, or this reports false simply because the read
 * hasn't finished.
 *
 * A stored empty string counts as known: only version.service writes this key,
 * and only after /app/config answered, so '' means "this backend takes no
 * prefix" — never an un-discovered placeholder.
 */
export function hasKnownApiPrefix(): boolean {
  return prefixHydratedFromStorage || prefixExplicitlySet;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

function isBootstrapPath(url: string | undefined): boolean {
  return (url ?? '').split('?')[0] === BOOTSTRAP_PATH;
}

// Returns the baseURL the request should resolve against. The bootstrap path always uses
// the bare API_BASE_URL; everything else gets the dynamic prefix appended. Setting baseURL
// (instead of mutating config.url) keeps the interceptor idempotent on retries — important
// because the response interceptor calls api(originalRequest) after refreshing tokens, and
// mutating the URL there would double-prefix it.
function resolveBaseUrl(url: string | undefined): string | undefined {
  if (isBootstrapPath(url) || !apiPrefix) return API_BASE_URL;
  return `${API_BASE_URL}${apiPrefix}`;
}

// Requests can opt out of the Bearer token by setting `skipAuth: true` on the
// axios config — used by anonymous endpoints (e.g. view counter) so the JWT
// never travels with calls that should not be tied to a user.
api.interceptors.request.use(
  async (config) => {
    const skipAuth = (config as { skipAuth?: boolean }).skipAuth === true;
    if (!skipAuth) {
      const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // The backend measures adoption by app version (it drives the force-update
    // floor), so attach it to every request, including the bootstrap.
    const appVersion = getInstalledAppVersion();
    if (appVersion) {
      config.headers['X-App-Version'] = appVersion;
    }

    // /app/config is served without a credential, so the version gate and
    // maintenance mode keep working even if a build ships a bad key.
    if (API_KEY && !isBootstrapPath(config.url)) {
      config.headers['x-api-key'] = API_KEY;
    }

    config.baseURL = resolveBaseUrl(config.url);
    logger.debug(`[API] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// reason parameter allows distinguishing security events (e.g. 'token_reuse') from normal expiry
let tokenExpirationCallback: ((reason?: string) => void) | null = null;

export const setTokenExpirationCallback = (callback: (reason?: string) => void) => {
  tokenExpirationCallback = callback;
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Network errors (no response, DNS, timeout) are transient — log at warn.
    // HTTP error responses from the server (4xx/5xx) get error-level logging
    // because they typically indicate something the client needs to investigate.
    const logAtLevel = isNetworkError(error) ? logger.warn : logger.error;
    logAtLevel(
      `[API] Response Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      }
    );

    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;

      // INVALID_API_KEY / INSTALL_TOKEN_MISSING are never replayed: the backend
      // counts each one toward an IP ban, so they fall through to the reject.
      if (errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Attach the API key manually since this call bypasses the request
          // interceptor (to avoid recursion if refresh itself 401s).
          const refreshHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          const refreshAppVersion = getInstalledAppVersion();
          if (refreshAppVersion) {
            refreshHeaders['X-App-Version'] = refreshAppVersion;
          }
          if (API_KEY) {
            refreshHeaders['x-api-key'] = API_KEY;
          }

          const response = await axios.post(
            `${API_BASE_URL}${apiPrefix}/auth/token/refresh`,
            { refreshToken },
            { headers: refreshHeaders }
          );

          const responseData = response.data?.data;
          if (!responseData?.accessToken || !responseData?.refreshToken) {
            throw new Error('Invalid refresh token response');
          }

          const { accessToken, refreshToken: newRefreshToken } = responseData;

          await SecureStore.setItemAsync(
            SECURE_STORE_KEYS.ACCESS_TOKEN,
            accessToken,
            SECURE_STORE_OPTIONS
          );
          await SecureStore.setItemAsync(
            SECURE_STORE_KEYS.REFRESH_TOKEN,
            newRefreshToken,
            SECURE_STORE_OPTIONS
          );

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          processQueue(null, accessToken);

          return api(originalRequest);
        } catch (refreshError: any) {
          // Clear queued requests without rejecting — the global handler will navigate away
          failedQueue = [];

          await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
          await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
          await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);

          if (tokenExpirationCallback) {
            const refreshErrorCode = refreshError?.response?.data?.code;
            tokenExpirationCallback(
              refreshErrorCode === 'SESSION_REPLACED' ? 'session_replaced' : undefined
            );
          }

          // Return a never-settling promise to prevent error propagation to screens
          // The global handler navigates away, unmounting all callers
          return new Promise(() => {});
        } finally {
          isRefreshing = false;
        }
      }

      const forceLogoutCodes = [
        'INVALID_TOKEN',
        'REFRESH_TOKEN_EXPIRED',
        'TOKEN_REUSE_DETECTED',
        'SESSION_INVALID',
        'REFRESH_TOKEN_REVOKED',
        'SESSION_EXPIRED',
        'INVALID_REFRESH_TOKEN',
        'SESSION_REPLACED',
      ];

      if (forceLogoutCodes.includes(errorCode)) {
        await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
        await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);

        if (tokenExpirationCallback) {
          // Pass specific reason so GlobalProvider can show context-appropriate alerts
          const reason =
            errorCode === 'TOKEN_REUSE_DETECTED'
              ? 'token_reuse'
              : errorCode === 'SESSION_REPLACED'
                ? 'session_replaced'
                : undefined;
          tokenExpirationCallback(reason);
        }

        // Return a never-settling promise to prevent error propagation to screens
        // The global handler navigates away, unmounting all callers
        return new Promise(() => {});
      }
    }

    // ACCOUNT_LOCKED is the account-lockout signal (backend ships it as 429, but
    // it is registered as 403 — so key on the code, not only the status, to stay
    // robust to either). Preserve the backend code so the sign-in screen can show
    // the dedicated lockout message instead of the generic rate-limit copy.
    const backendCode = error.response?.data?.code;
    if (
      error.response?.status === 429 ||
      backendCode === 'RATE_LIMIT_EXCEEDED' ||
      backendCode === 'ACCOUNT_LOCKED'
    ) {
      const rateLimitError: RateLimitError = Object.assign(
        new Error('Too many requests. Please wait a moment and try again.'),
        {
          code: backendCode === 'ACCOUNT_LOCKED' ? 'ACCOUNT_LOCKED' : 'RATE_LIMIT_EXCEEDED',
          isRateLimited: true,
          originalError: error,
        }
      );

      logger.warn('[API] Rate limit exceeded', {
        url: error.config?.url,
        status: error.response?.status,
        code: rateLimitError.code,
      });

      return Promise.reject(rateLimitError);
    }

    return Promise.reject(error);
  }
);

export default api;
