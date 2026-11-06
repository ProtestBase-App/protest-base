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
  /** Seconds until the backend accepts the request again, when it says so. */
  retryAfter?: number;
  originalError: unknown;
}

/** The parts of an axios error this module reads. */
interface HttpErrorLike {
  response?: {
    status?: number;
    data?: { code?: unknown; retryAfter?: unknown };
    headers?: Record<string, unknown>;
  };
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

/** Why a session ended, so the alert can say so. `undefined` means it simply expired. */
export type SessionEndReason = 'token_reuse' | 'session_replaced' | 'account_disabled';

let tokenExpirationCallback: ((reason?: SessionEndReason) => void) | null = null;

export const setTokenExpirationCallback = (callback: (reason?: SessionEndReason) => void) => {
  tokenExpirationCallback = callback;
};

/**
 * 401 codes that end the session whatever the request was. The login-security codes (MFA_*,
 * REAUTH_REQUIRED, ACCOUNT_DISABLED, see types/auth.types.ts) must never join: screens explain
 * those, and a force-logout would wipe local data and leave the sign-in screen waiting.
 */
export const FORCE_LOGOUT_CODES: readonly string[] = [
  'INVALID_TOKEN',
  'REFRESH_TOKEN_EXPIRED',
  'TOKEN_REUSE_DETECTED',
  'SESSION_INVALID',
  'REFRESH_TOKEN_REVOKED',
  'SESSION_EXPIRED',
  'INVALID_REFRESH_TOKEN',
  'SESSION_REPLACED',
];

function sessionEndReason(code: unknown): SessionEndReason | undefined {
  switch (code) {
    case 'TOKEN_REUSE_DETECTED':
      return 'token_reuse';
    case 'SESSION_REPLACED':
      return 'session_replaced';
    case 'ACCOUNT_DISABLED':
      return 'account_disabled';
    default:
      return undefined;
  }
}

// Several in-flight requests can fail together when a session dies; only the first may wipe
// local data and raise the alert. A new session re-arms it (markSessionActive).
let sessionEnded = false;

/** Call once a new session's tokens are stored, so its own end is reported again. */
export function markSessionActive(): void {
  sessionEnded = false;
}

async function endSession(reason: SessionEndReason | undefined): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);
  if (sessionEnded) return;
  sessionEnded = true;
  tokenExpirationCallback?.(reason);
}

/** The access token a request was sent with, or null for an anonymous request. */
function bearerToken(config: { headers?: Record<string, unknown> } | undefined): string | null {
  const header = config?.headers?.Authorization ?? config?.headers?.authorization;
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Rotation grace: the backend answers a replayed refresh token with the same new pair for
// 30 s (REFRESH_TOKEN_GRACE_PERIOD_SECONDS); after that, a replay revokes every session the
// user has. A refresh lost in transit is retried quickly, and never once that window may
// have closed: worst case 8 + 1 + 8 + 2 + 8 = 27 s, with no retry sent after 25 s.
const REFRESH_TIMEOUT_MS = 8_000;
const REFRESH_RETRY_DELAYS_MS = [1_000, 2_000];
const REFRESH_RETRY_DEADLINE_MS = 25_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** No response, a timeout or a 5xx: the backend may or may not have rotated the token. */
function isTransientRefreshFailure(error: unknown): boolean {
  const status = (error as HttpErrorLike)?.response?.status;
  return status === undefined || status >= 500;
}

// Posts the refresh with plain axios: the instance's interceptors would recurse if the
// refresh itself failed, so the API key and app version are attached here.
async function requestTokenRefresh(refreshToken: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const appVersion = getInstalledAppVersion();
  if (appVersion) {
    headers['X-App-Version'] = appVersion;
  }
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  // Measured from the first send, not per attempt: iOS pauses timers in the background, so a
  // one-second delay can fire minutes later, long after the grace window.
  const startedAt = Date.now();
  for (let attempt = 0; ; attempt++) {
    try {
      return await axios.post(
        `${API_BASE_URL}${apiPrefix}/auth/token/refresh`,
        { refreshToken },
        { headers, timeout: REFRESH_TIMEOUT_MS }
      );
    } catch (error) {
      const delay = REFRESH_RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isTransientRefreshFailure(error)) throw error;
      await wait(delay);
      if (Date.now() - startedAt > REFRESH_RETRY_DEADLINE_MS) throw error;
      logger.warn('[API] Token refresh failed in transit, retrying', { attempt: attempt + 1 });
    }
  }
}

// ACCOUNT_LOCKED (sign-in) and MFA_LOCKED (second step) keep their own code, so the screen can
// show the lockout and its wait instead of the generic rate-limit copy.
const LOCKOUT_CODES: readonly string[] = ['ACCOUNT_LOCKED', 'MFA_LOCKED'];

function retryAfterSeconds(error: HttpErrorLike): number | undefined {
  const fromBody = Number(error.response?.data?.retryAfter);
  if (Number.isFinite(fromBody) && fromBody > 0) return fromBody;
  const fromHeader = Number(error.response?.headers?.['retry-after']);
  return Number.isFinite(fromHeader) && fromHeader > 0 ? fromHeader : undefined;
}

// Rejected without `.response`: service catches must check `code` / `isRateLimited` first.
function toRateLimitError(error: unknown): RateLimitError {
  const httpError = (error ?? {}) as HttpErrorLike;
  const backendCode = httpError.response?.data?.code;
  return Object.assign(new Error('Too many requests. Please wait a moment and try again.'), {
    code:
      typeof backendCode === 'string' && LOCKOUT_CODES.includes(backendCode)
        ? backendCode
        : 'RATE_LIMIT_EXCEEDED',
    isRateLimited: true,
    retryAfter: retryAfterSeconds(httpError),
    originalError: error,
  });
}

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
        // Sent with an access token a refresh has already replaced: retry with the stored one
        // instead of rotating again. With 15-minute tokens, requests often straddle the expiry.
        const sentToken = bearerToken(originalRequest);
        if (sentToken && !isRefreshing) {
          const storedToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
          if (storedToken && storedToken !== sentToken) {
            originalRequest._retry = true;
            originalRequest.headers.Authorization = `Bearer ${storedToken}`;
            return api(originalRequest);
          }
        }

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

          const response = await requestTokenRefresh(refreshToken);

          const responseData = response?.data?.data;
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
        } catch (refreshError: unknown) {
          // The backend rate-limits before it rotates, so the stored tokens are still good:
          // keep the session and let the requests fail like any other 429.
          if ((refreshError as HttpErrorLike)?.response?.status === 429) {
            const rateLimitError = toRateLimitError(refreshError);
            processQueue(rateLimitError);
            return Promise.reject(rateLimitError);
          }

          // Clear queued requests without rejecting — the global handler will navigate away
          failedQueue = [];

          await endSession(sessionEndReason((refreshError as HttpErrorLike)?.response?.data?.code));

          // Return a never-settling promise to prevent error propagation to screens
          // The global handler navigates away, unmounting all callers
          return new Promise(() => {});
        } finally {
          isRefreshing = false;
        }
      }

      if (FORCE_LOGOUT_CODES.includes(errorCode)) {
        await endSession(sessionEndReason(errorCode));

        // Return a never-settling promise to prevent error propagation to screens
        // The global handler navigates away, unmounting all callers
        return new Promise(() => {});
      }
    }

    // Every authenticated route refuses a disabled account (public routes browse it as a
    // guest), so on a request made with the session's token the session is over. Without a
    // token (sign-in, second step, enrolment) the screen that asked explains it instead.
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'ACCOUNT_DISABLED' &&
      bearerToken(originalRequest)
    ) {
      await endSession('account_disabled');
      return new Promise(() => {});
    }

    // Lockouts are keyed on the code as well as the status: ACCOUNT_LOCKED ships as 429 but is
    // registered as 403, so stay robust to either.
    const backendCode = error.response?.data?.code;
    if (
      error.response?.status === 429 ||
      backendCode === 'RATE_LIMIT_EXCEEDED' ||
      LOCKOUT_CODES.includes(backendCode)
    ) {
      const rateLimitError = toRateLimitError(error);

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
