// Mock dependencies before imports
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import api from '@/services/api';
import * as SecureStore from 'expo-secure-store';
import {
  login,
  logout,
  logoutAll,
  getCurrentUser,
  getCurrentUserSessions,
  forgotPassword,
  deleteAccount,
} from '@/services/auth.service';
import type { User } from '@/types/auth.types';

const mockApi = api as jest.Mocked<typeof api>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const mockUser: User = {
  $id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  emailVerification: true,
  status: true,
  registration: '2025-01-01T00:00:00Z',
};

describe('auth.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // login
  // ============================================================
  describe('login', () => {
    it('stores tokens and returns user on success', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            accessToken: 'access-tok',
            refreshToken: 'refresh-tok',
            session: { $id: 'sess-1' },
            user: mockUser,
          },
        },
      });

      const result = await login('user@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'user@example.com',
        password: 'password123',
      });
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'access_token',
        'access-tok',
        expect.any(Object)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-tok',
        expect.any(Object)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_id',
        'sess-1',
        expect.any(Object)
      );
    });

    it('throws "Login failed" when accessToken is missing (internal error caught by outer catch)', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            // no accessToken
            refreshToken: 'refresh-tok',
            session: { $id: 'sess-1' },
            user: mockUser,
          },
        },
      });

      // Internal throw has no response.data.error → outer catch yields 'Login failed'
      await expect(login('user@example.com', 'password123')).rejects.toThrow('Login failed');
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('throws "Login failed" when refreshToken is missing (internal error caught by outer catch)', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            accessToken: 'access-tok',
            // no refreshToken
            session: { $id: 'sess-1' },
            user: mockUser,
          },
        },
      });

      // Internal throw has no response.data.error → outer catch yields 'Login failed'
      await expect(login('user@example.com', 'password123')).rejects.toThrow('Login failed');
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('throws "Login failed" when session is missing (internal error caught by outer catch)', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            accessToken: 'access-tok',
            refreshToken: 'refresh-tok',
            // no session
            user: mockUser,
          },
        },
      });

      await expect(login('user@example.com', 'password123')).rejects.toThrow('Login failed');
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('throws "Login failed" when user is missing (internal error caught by outer catch)', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            accessToken: 'access-tok',
            refreshToken: 'refresh-tok',
            session: { $id: 'sess-1' },
            // no user
          },
        },
      });

      await expect(login('user@example.com', 'password123')).rejects.toThrow('Login failed');
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('throws backend error message on API error response', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { data: { error: 'Invalid credentials' } },
        message: 'Request failed',
      });

      await expect(login('user@example.com', 'wrong-password')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('throws "Login failed" when no backend error message available', async () => {
      mockApi.post.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(login('user@example.com', 'password123')).rejects.toThrow('Login failed');
    });

    it('throws "Login failed" on network error without response', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(login('user@example.com', 'password123')).rejects.toThrow('Login failed');
    });
  });

  // ============================================================
  // getCurrentUser
  // ============================================================
  describe('getCurrentUser', () => {
    it('returns the user on success', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockUser },
      });

      const result = await getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockApi.get).toHaveBeenCalledWith('/auth/user/info');
    });

    it('returns null when error code is NO_TOKEN with statusCode 401', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { code: 'NO_TOKEN', statusCode: 401, error: 'No token' } },
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('throws when error code is NO_TOKEN but statusCode is not 401', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { code: 'NO_TOKEN', statusCode: 403, error: 'Forbidden' } },
      });

      await expect(getCurrentUser()).rejects.toThrow('Forbidden');
    });

    it('throws with backend error message on other errors', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { code: 'INVALID_TOKEN', error: 'Token invalid' } },
      });

      await expect(getCurrentUser()).rejects.toThrow('Token invalid');
    });

    it('throws "Failed to get user" when no error message available', async () => {
      mockApi.get.mockRejectedValueOnce({});

      await expect(getCurrentUser()).rejects.toThrow('Failed to get user');
    });
  });

  // ============================================================
  // getCurrentUserSessions
  // ============================================================
  describe('getCurrentUserSessions', () => {
    const mockSessionData = {
      total: 1,
      session: [
        {
          $id: 'sess-1',
          $createdAt: '2025-01-01T00:00:00Z',
          $updatedAt: '2025-01-01T00:00:00Z',
          userId: 'user-1',
          expire: '2025-12-31T00:00:00Z',
          provider: 'email',
          providerUid: 'user@example.com',
          providerAccessToken: null,
          providerAccessTokenExpiry: null,
          providerRefreshToken: null,
          ip: '127.0.0.1',
          osCode: 'ios',
          osName: 'iOS',
          osVersion: '17.0',
          clientType: 'mobile',
          clientCode: null,
          clientName: null,
          clientVersion: null,
          clientEngine: null,
          clientEngineVersion: null,
          deviceName: 'iPhone',
          deviceBrand: 'Apple',
          deviceModel: 'iPhone 15',
          countryCode: 'BE',
          countryName: 'Belgium',
          current: true,
          factors: [],
        },
      ],
    };

    it('returns session data on success', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockSessionData },
      });

      const result = await getCurrentUserSessions();

      expect(result).toEqual(mockSessionData);
      expect(mockApi.get).toHaveBeenCalledWith('/auth/user/sessions');
    });

    it('returns null when error code is NO_TOKEN with statusCode 401', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { code: 'NO_TOKEN', statusCode: 401, error: 'No token' } },
      });

      const result = await getCurrentUserSessions();

      expect(result).toBeNull();
    });

    it('throws with backend error message on other errors', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: 'Session fetch failed' } },
      });

      await expect(getCurrentUserSessions()).rejects.toThrow('Session fetch failed');
    });

    it('throws "Failed to get user sessions" when no error message', async () => {
      mockApi.get.mockRejectedValueOnce({});

      await expect(getCurrentUserSessions()).rejects.toThrow('Failed to get user sessions');
    });
  });

  // ============================================================
  // logout
  // ============================================================
  describe('logout', () => {
    it('calls logout endpoint and clears all tokens', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await logout();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
    });

    it('still clears tokens even when logout endpoint fails', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network Error'));

      await logout();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
    });

    it('does not throw even when endpoint returns 401', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Already logged out' } },
      });

      await expect(logout()).resolves.toBeUndefined();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================
  // logoutAll
  // ============================================================
  describe('logoutAll', () => {
    it('calls logout-all endpoint and clears all tokens', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await logoutAll();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout-all');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
    });

    it('still clears tokens even when logout-all endpoint fails', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network Error'));

      await logoutAll();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
    });
  });

  // ============================================================
  // forgotPassword
  // ============================================================
  describe('forgotPassword', () => {
    it('returns success response on success', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: null, message: 'Reset email sent' },
      });

      const result = await forgotPassword('user@example.com');

      expect(result.success).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'user@example.com',
      });
    });

    it('throws with backend error message on API error', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { data: { error: 'Email not found' } },
        message: 'Request failed',
      });

      await expect(forgotPassword('unknown@example.com')).rejects.toThrow('Email not found');
    });

    it('throws "Failed to send password reset email" when no error details', async () => {
      mockApi.post.mockRejectedValueOnce({});

      await expect(forgotPassword('user@example.com')).rejects.toThrow(
        'Failed to send password reset email'
      );
    });
  });

  // ============================================================
  // deleteAccount
  // ============================================================
  describe('deleteAccount', () => {
    it('deletes account and clears all tokens on success', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: {} });

      await deleteAccount('password123');

      expect(mockApi.delete).toHaveBeenCalledWith('/auth/account', {
        data: { password: 'password123' },
      });
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('session_id');
    });

    it('throws with backend error message on API error', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { data: { error: 'Account deletion failed' } },
        message: 'Request failed',
      });

      await expect(deleteAccount('password123')).rejects.toThrow('Account deletion failed');
    });

    it('does NOT clear tokens when deletion fails', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { data: { error: 'Cannot delete' } },
      });

      await expect(deleteAccount('password123')).rejects.toThrow();
      expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('throws "Failed to delete account" when no error details', async () => {
      mockApi.delete.mockRejectedValueOnce({});

      await expect(deleteAccount('password123')).rejects.toThrow('Failed to delete account');
    });
  });
});
