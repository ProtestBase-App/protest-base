import api, { appLanguage, markSessionActive } from '@/services/api';
import * as SecureStore from 'expo-secure-store';
import type {
  User,
  LoginResponse,
  ApiError,
  SessionData,
  SessionResponse,
} from '@/types/auth.types';
import { SECURE_STORE_KEYS } from '@/constants/StorageConfig';
import { isNetworkError } from '@/utils/networkError';
import { SECURE_STORE_OPTIONS } from '@/utils/secureStoreOptions';
import { toAuthError } from '@/utils/authError';

/** The parts of a sign-in answer (login, second step, enrolment) that make a session. */
interface SessionPayload {
  accessToken?: string;
  refreshToken?: string;
  session?: { $id?: string };
  user?: User;
}

/** Stores a new session and re-arms the session-end alert. Returns the signed-in user. */
export const storeSession = async (data: SessionPayload | undefined): Promise<User> => {
  if (!data?.accessToken || !data?.refreshToken || !data?.session?.$id || !data?.user) {
    throw new Error('Invalid login response from server');
  }

  await SecureStore.setItemAsync(
    SECURE_STORE_KEYS.ACCESS_TOKEN,
    data.accessToken,
    SECURE_STORE_OPTIONS
  );
  await SecureStore.setItemAsync(
    SECURE_STORE_KEYS.REFRESH_TOKEN,
    data.refreshToken,
    SECURE_STORE_OPTIONS
  );
  await SecureStore.setItemAsync(
    SECURE_STORE_KEYS.SESSION_ID,
    data.session.$id,
    SECURE_STORE_OPTIONS
  );
  markSessionActive();

  return data.user;
};

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    return await storeSession(response.data?.data);
  } catch (error: any) {
    // The response interceptor rejects rate-limit / lockout errors as a plain
    // Error carrying `code`/`isRateLimited` but no `.response`. Forward those
    // intact so the sign-in screen can show the correct message; the generic
    // extraction below would otherwise collapse them into 'Login failed'.
    if (
      error?.isRateLimited ||
      error?.code === 'RATE_LIMIT_EXCEEDED' ||
      error?.code === 'ACCOUNT_LOCKED'
    ) {
      throw error;
    }
    // Keeps the backend code and body: a second sign-in step or a disabled account is not
    // a wrong password, and the screen has to tell them apart.
    throw toAuthError(error, 'Login failed');
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await api.get<{ success: true; data: User }>('/auth/user/info');
    return response.data.data;
  } catch (error: any) {
    // Preserve network errors so upstream (GlobalProvider) can distinguish them
    // from auth errors.
    if (isNetworkError(error)) {
      throw error;
    }
    const apiError = error.response?.data as ApiError;
    // Treat NO_TOKEN as "not authenticated" rather than an error.
    if (apiError?.code === 'NO_TOKEN' && apiError?.statusCode === 401) {
      return null;
    }
    throw new Error(apiError?.error || 'Failed to get user');
  }
};

export const getCurrentUserSessions = async (): Promise<SessionData | null> => {
  try {
    const response = await api.get<SessionResponse>('/auth/user/sessions');
    return response.data.data;
  } catch (error: any) {
    if (isNetworkError(error)) {
      throw error;
    }
    const apiError = error.response?.data as ApiError;
    if (apiError?.code === 'NO_TOKEN' && apiError?.statusCode === 401) {
      return null;
    }
    throw new Error(apiError?.error || 'Failed to get user sessions');
  }
};

/** Logout current device. */
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Always clear local tokens, even if the server call fails.
  } finally {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);
  }
};

/** Logout from all devices. */
export const logoutAll = async (): Promise<void> => {
  try {
    await api.post('/auth/logout-all');
  } catch (error) {
    // Always clear local tokens, even if the server call fails.
  } finally {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);
  }
};

export const forgotPassword = async (
  email: string
): Promise<{ success: true; data: Record<string, unknown>; message?: string }> => {
  try {
    // `lang` picks the reset mail's language; the backend also reads Accept-Language.
    const response = await api.post<{
      success: true;
      data: Record<string, unknown>;
      message?: string;
    }>('/auth/forgot-password', { email, lang: appLanguage() });
    return response.data;
  } catch (error: any) {
    // Forward interceptor-shaped rate-limit / lockout errors intact (see login()).
    if (
      error?.isRateLimited ||
      error?.code === 'RATE_LIMIT_EXCEEDED' ||
      error?.code === 'ACCOUNT_LOCKED'
    ) {
      throw error;
    }
    const apiError = error.response?.data as ApiError;
    throw new Error(apiError?.error || 'Failed to send password reset email');
  }
};

/**
 * Delete account; requires password confirmation. An account with a second factor also needs
 * `reauthToken` from /auth/reauth: without it the backend answers 403 REAUTH_REQUIRED.
 */
export const deleteAccount = async (password: string, reauthToken?: string): Promise<void> => {
  try {
    await api.delete('/auth/account', {
      data: reauthToken ? { password, reauthToken } : { password },
    });
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);
  } catch (error: any) {
    // Forward interceptor-shaped rate-limit / lockout errors intact (see login()).
    // The interceptor rewrites these globally with no `.response`, so without this
    // guard the delete-account screen's dedicated rate-limit message is unreachable.
    if (
      error?.isRateLimited ||
      error?.code === 'RATE_LIMIT_EXCEEDED' ||
      error?.code === 'ACCOUNT_LOCKED'
    ) {
      throw error;
    }
    const apiError = error.response?.data as ApiError;
    if (apiError?.code === 'INVALID_CREDENTIALS') {
      throw new Error('INVALID_CREDENTIALS');
    }
    // Keeps the code: REAUTH_REQUIRED sends the screen to the second-factor step.
    throw toAuthError(error, 'Failed to delete account');
  }
};
