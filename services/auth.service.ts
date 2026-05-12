import api from '@/services/api';
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

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    const responseData = response.data?.data;
    if (
      !responseData?.accessToken ||
      !responseData?.refreshToken ||
      !responseData?.session?.$id ||
      !responseData?.user
    ) {
      throw new Error('Invalid login response from server');
    }

    await SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, responseData.accessToken);
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, responseData.refreshToken);
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.SESSION_ID, responseData.session.$id);

    return responseData.user;
  } catch (error: any) {
    const apiError = error.response?.data as ApiError;
    throw new Error(apiError?.error || 'Login failed');
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
    const response = await api.post<{
      success: true;
      data: Record<string, unknown>;
      message?: string;
    }>('/auth/forgot-password', { email });
    return response.data;
  } catch (error: any) {
    const apiError = error.response?.data as ApiError;
    throw new Error(apiError?.error || 'Failed to send password reset email');
  }
};

/** Delete account; requires password confirmation. */
export const deleteAccount = async (password: string): Promise<void> => {
  try {
    await api.delete('/auth/account', { data: { password } });
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);
  } catch (error: any) {
    const apiError = error.response?.data as ApiError;
    if (apiError?.code === 'INVALID_CREDENTIALS') {
      throw new Error('INVALID_CREDENTIALS');
    }
    throw new Error(apiError?.error || 'Failed to delete account');
  }
};
