/**
 * Navigation Loading State Integration Tests
 *
 * Tests the loading state machine: all providers must finish loading
 * before redirect, auth state determines redirect target.
 * Would have caught loading state race conditions.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';
import { createMockUser, createMockSession, flushPromises, resetTestState } from './test-utils';
import { getLocales } from 'expo-localization';

// ============================================
// Mock ONLY the API/storage boundary
// ============================================

const mockSecureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore[key] || null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  }),
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { apiBaseUrl: 'http://test' } },
}));

const mockGetCurrentUser = jest.fn();
const mockGetCurrentUserSessions = jest.fn();
jest.mock('@/services/auth.service', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  getCurrentUserSessions: (...args: any[]) => mockGetCurrentUserSessions(...args),
}));

const mockGetEventsBackend = jest.fn();
jest.mock('@/services/event.service', () => ({
  getEventsBackend: (...args: any[]) => mockGetEventsBackend(...args),
  fetchEventCounts: jest.fn(() => Promise.resolve({ upcoming: 0, past: 0 })),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: jest.fn(),
}));

// Keep GlobalProvider's snapshot persistence inert so fire-and-forget writes
// can't leak state between tests via the shared stateful AsyncStorage mock.
jest.mock('@/services/eventsCacheStorage', () => ({
  loadPersistedEvents: jest.fn(() => Promise.resolve(null)),
  persistEvents: jest.fn(() => Promise.resolve()),
}));

// Mock Alert (must use __esModule + default since Alert uses `export default`)
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  __esModule: true,
  default: { alert: jest.fn() },
}));

// ============================================
// Tests
// ============================================

describe('Navigation Loading State Integration', () => {
  const mockUser = createMockUser();
  const mockSession = createMockSession(mockUser.$id, 'session-1');

  beforeEach(() => {
    jest.clearAllMocks();
    resetTestState();
    Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });
    // Reset locale to default
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'en' }]);
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <GlobalProvider>{children}</GlobalProvider>;
  }

  it('should start in loading state before session validation completes', () => {
    // Make auth calls hang (never resolve)
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    // Should be loading - screen should NOT redirect yet
    expect(result.current.loading).toBe(true);
    expect(result.current.isLogged).toBe(false);
  });

  it('should resolve to logged-in state after slow session validation', async () => {
    // Simulate slow network
    let resolveCurrentUser: (value: any) => void;
    const currentUserPromise = new Promise((resolve) => {
      resolveCurrentUser = resolve;
    });

    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockReturnValue(currentUserPromise);
    mockGetCurrentUserSessions.mockResolvedValue({
      total: 1,
      session: [mockSession],
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    // Still loading
    expect(result.current.loading).toBe(true);

    // Now resolve the slow call
    await act(async () => {
      resolveCurrentUser!(mockUser);
      await flushPromises();
    });

    // Should now be logged in
    expect(result.current.loading).toBe(false);
    expect(result.current.isLogged).toBe(true);
    expect(result.current.user?.$id).toBe(mockUser.$id);
  });

  it('should resolve to logged-out state for unauthenticated user', async () => {
    // No tokens stored
    mockGetCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should not set loading=false until session validation is complete', async () => {
    // First call is slow, second is instant
    let resolveSessionCheck: (value: any) => void;
    const sessionCheckPromise = new Promise((resolve) => {
      resolveSessionCheck = resolve;
    });

    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetCurrentUserSessions.mockReturnValue(sessionCheckPromise);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    // Even though getCurrentUser resolved, we're still waiting on sessions
    await act(async () => {
      await flushPromises();
    });

    // Loading should still be true because session check hasn't completed
    expect(result.current.loading).toBe(true);

    // Now resolve session check
    await act(async () => {
      resolveSessionCheck!({ total: 1, session: [mockSession] });
      await flushPromises();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.isLogged).toBe(true);
  });

  it('should handle concurrent events and auth loading independently', async () => {
    // Events load slowly, auth resolves quickly
    let resolveEvents: (value: any) => void;
    const eventsPromise = new Promise((resolve) => {
      resolveEvents = resolve;
    });

    mockGetEventsBackend.mockReturnValue(eventsPromise);
    mockGetCurrentUser.mockResolvedValue(null); // Not logged in

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // Auth should be done (loading=false), but events still loading
    expect(result.current.loading).toBe(false);
    expect(result.current.eventsLoading).toBe(true);

    // Now resolve events
    await act(async () => {
      resolveEvents!({ events: [], total: 0, limit: 100, offset: 0 });
      await flushPromises();
    });

    expect(result.current.eventsLoading).toBe(false);
  });

  it('should detect correct language from device locale', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // The mock returns 'en' locale
    expect(result.current.userLanguage).toBe('en');
  });

  it('should clear auth state when token expiration fires during active session', async () => {
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetCurrentUserSessions.mockResolvedValue({
      total: 1,
      session: [mockSession],
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isLogged).toBe(true);
    expect(result.current.loading).toBe(false);

    // Get and fire the token expiration callback
    const { setTokenExpirationCallback } = require('@/services/api');
    const callback = (setTokenExpirationCallback as jest.Mock).mock.calls[0][0];

    await act(async () => {
      callback();
      await flushPromises();
    });

    // Auth should be cleared, loading stays false (not re-validating)
    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should complete auth loading even when events fetch fails', async () => {
    mockGetEventsBackend.mockRejectedValue(new Error('Events API down'));
    mockGetCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // Auth loading should complete independently of events error
    expect(result.current.loading).toBe(false);
    expect(result.current.isLogged).toBe(false);
    // Events should handle the error gracefully
    expect(result.current.eventsLoading).toBe(false);
    expect(result.current.eventsCache).toEqual({});
  });

  it('should detect French language from device locale', async () => {
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'fr' }]);
    mockGetCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.userLanguage).toBe('fr');
  });

  it('should detect Dutch language from device locale', async () => {
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'nl' }]);
    mockGetCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.userLanguage).toBe('nl');
  });

  it('should fallback to English for unsupported locale', async () => {
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'de' }]);
    mockGetCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.userLanguage).toBe('en');
  });

  it('should fallback to English when locale is null', async () => {
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: null }]);
    mockGetCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.userLanguage).toBe('en');
  });
});
