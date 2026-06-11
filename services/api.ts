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

// integrity.service.ts also imports from this module, so use a deferred require
// inside the interceptors to avoid a circular import at module-eval time.
type IntegrityModule = typeof import('@/services/integrity.service');
let integrityModuleCache: IntegrityModule | null = null;
function getIntegrityModule(): IntegrityModule {
  if (!integrityModuleCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    integrityModuleCache = require('@/services/integrity.service') as IntegrityModule;
  }
  return integrityModuleCache;
}

const DEV_INTEGRITY_BYPASS = Constants.expoConfig?.extra?.devIntegrityBypass as string | undefined;

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

export function getApiPrefix(): string {
  return apiPrefix;
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

// Best-effort warm-start hydration — loads persisted prefix before /app/config returns.
// VersionGate blocks all other API traffic until /app/config completes, but hydrating early
// is cheap insurance. The prefixExplicitlySet guard prevents an out-of-order resolution
// from overwriting a value just set by a fast bootstrap response.
(async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.API_PREFIX);
    if (stored !== null && !prefixExplicitlySet) {
      apiPrefix = normalizePrefix(stored);
    }
  } catch {
    // best-effort; ignore
  }
})();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Returns the baseURL the request should resolve against. The bootstrap path always uses
// the bare API_BASE_URL; everything else gets the dynamic prefix appended. Setting baseURL
// (instead of mutating config.url) keeps the interceptor idempotent on retries — important
// because the response interceptor calls api(originalRequest) after refreshing tokens, and
// mutating the URL there would double-prefix it.
function resolveBaseUrl(url: string | undefined): string | undefined {
  const isBootstrap = url === BOOTSTRAP_PATH || (url ?? '').startsWith(`${BOOTSTRAP_PATH}?`);
  if (isBootstrap || !apiPrefix) return API_BASE_URL;
  return `${API_BASE_URL}${apiPrefix}`;
}

// Endpoints that must not carry an integrity header — they are the integrity
// flow itself (called via raw axios in integrity.service.ts) and the bootstrap
// /app/config request (anonymous; runs before integrity has a chance to attest).
const INTEGRITY_EXEMPT_PATHS = new Set([
  BOOTSTRAP_PATH,
  '/auth/integrity/nonce',
  '/auth/integrity/attest',
]);

function isIntegrityExempt(url: string | undefined): boolean {
  if (!url) return false;
  if (INTEGRITY_EXEMPT_PATHS.has(url)) return true;
  // Some callers may pass query strings.
  const base = url.split('?')[0];
  return INTEGRITY_EXEMPT_PATHS.has(base);
}

// 401 error codes that share the same recovery: drop the cached install token
// and retry once. The request interceptor refetches the token on the replay.
const INTEGRITY_RETRY_401_CODES: ReadonlySet<string> = new Set([
  'INSTALL_TOKEN_EXPIRED',
  'INSTALL_TOKEN_INVALID',
  'INSTALL_TOKEN_MISSING',
]);

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

    // Backend logs this in fallback events so rollout adoption can be measured
    // by app version. Attach to every request, including bootstrap and
    // integrity-exempt endpoints.
    const appVersion = getInstalledAppVersion();
    if (appVersion) {
      config.headers['X-App-Version'] = appVersion;
    }

    // Attach the integrity header on every API call except the integrity-flow
    // endpoints themselves and the bootstrap /app/config call. Preview and
    // production builds send X-Install-Token (a per-install bearer issued by
    // /auth/integrity/attest after real App Attest / Play Integrity verifies);
    // development builds send X-Dev-Integrity-Bypass which the backend honors
    // only when its own NODE_ENV is non-production.
    if (!isIntegrityExempt(config.url)) {
      if (!getIntegrityModule().isBypassMode()) {
        try {
          const installToken = await getIntegrityModule().getInstallToken();
          config.headers['X-Install-Token'] = installToken;
        } catch (error) {
          // Don't block the request here — let the backend respond with
          // INSTALL_TOKEN_MISSING so the response interceptor can trigger a
          // retry through the normal 401 flow.
          logger.warn('[API] Failed to attach install token; sending request without it', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else if (DEV_INTEGRITY_BYPASS) {
        config.headers['X-Dev-Integrity-Bypass'] = DEV_INTEGRITY_BYPASS;
      }
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

      // INSTALL_TOKEN_{EXPIRED,INVALID,MISSING} all use the same recovery shape:
      // drop the cached install token and replay the request once. The request
      // interceptor will re-fetch a fresh token via getInstallToken() — either
      // by re-attesting (EXPIRED/INVALID) or by attaching the just-minted
      // token that the interceptor previously failed to attach (MISSING).
      if (INTEGRITY_RETRY_401_CODES.has(errorCode) && !originalRequest._integrityRetry) {
        originalRequest._integrityRetry = true;
        try {
          await getIntegrityModule().clearInstallToken();
        } catch (clearError) {
          logger.warn('[API] Failed to clear install token before retry', {
            error: clearError instanceof Error ? clearError.message : String(clearError),
          });
        }
        return api(originalRequest);
      }

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

          // Attach the integrity header manually since this call bypasses the
          // request interceptor (to avoid recursion if refresh itself 401s).
          const refreshHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          const refreshAppVersion = getInstalledAppVersion();
          if (refreshAppVersion) {
            refreshHeaders['X-App-Version'] = refreshAppVersion;
          }
          if (!getIntegrityModule().isBypassMode()) {
            try {
              refreshHeaders['X-Install-Token'] = await getIntegrityModule().getInstallToken();
            } catch (integrityError) {
              logger.warn('[API] Failed to attach install token to refresh request', {
                error:
                  integrityError instanceof Error ? integrityError.message : String(integrityError),
              });
            }
          } else if (DEV_INTEGRITY_BYPASS) {
            refreshHeaders['X-Dev-Integrity-Bypass'] = DEV_INTEGRITY_BYPASS;
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

    // 403 UNTRUSTED_INSTALL — token is structurally valid but the trust level
    // is too low (e.g. dev-bypass token hitting a production-only endpoint, or
    // attestation degraded after issuance). Same recovery as the 401 integrity
    // codes: drop the cached token, re-attest, retry once.
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'UNTRUSTED_INSTALL' &&
      !originalRequest._integrityRetry
    ) {
      originalRequest._integrityRetry = true;
      try {
        await getIntegrityModule().clearInstallToken();
      } catch (clearError) {
        logger.warn('[API] Failed to clear install token before UNTRUSTED_INSTALL retry', {
          error: clearError instanceof Error ? clearError.message : String(clearError),
        });
      }
      return api(originalRequest);
    }

    if (error.response?.status === 429 || error.response?.data?.code === 'RATE_LIMIT_EXCEEDED') {
      const rateLimitError: RateLimitError = Object.assign(
        new Error('Too many requests. Please wait a moment and try again.'),
        { code: 'RATE_LIMIT_EXCEEDED', isRateLimited: true, originalError: error }
      );

      logger.warn('[API] Rate limit exceeded', {
        url: error.config?.url,
        status: error.response?.status,
      });

      return Promise.reject(rateLimitError);
    }

    return Promise.reject(error);
  }
);

export default api;
