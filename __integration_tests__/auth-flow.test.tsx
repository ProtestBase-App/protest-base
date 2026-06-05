/**
 * Auth Flow Integration Tests
 *
 * Wires real GlobalProvider with mocked API responses.
 * Tests: login sets user state, failed login shows error state,
 * token refresh works, logout clears state.
 */
import React from 'react';
import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';
import { createMockUser, createMockSession, flushPromises, resetTestState } from './test-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Mock ONLY the API/storage boundary
// ============================================

// Mock SecureStore (storage boundary)
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

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { apiBaseUrl: 'http://test' } },
}));

// Mock the auth service (API boundary)
const mockGetCurrentUser = jest.fn();
const mockGetCurrentUserSessions = jest.fn();
jest.mock('@/services/auth.service', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  getCurrentUserSessions: (...args: any[]) => mockGetCurrentUserSessions(...args),
}));

// Mock the event service (API boundary)
const mockGetEventsBackend = jest.fn();
const mockFetchEventCounts = jest.fn();
jest.mock('@/services/event.service', () => ({
  getEventsBackend: (...args: any[]) => mockGetEventsBackend(...args),
  fetchEventCounts: (...args: any[]) => mockFetchEventCounts(...args),
}));

// Mock the api module's setTokenExpirationCallback
const mockSetTokenExpirationCallback = jest.fn();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: (...args: any[]) => mockSetTokenExpirationCallback(...args),
}));

// Mock expo-router (needed for GlobalProvider's token expiration handler)
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

// ============================================
// Tests
// ============================================

describe('Auth Flow Integration', () => {
  const mockUser = createMockUser();
  const mockSession = createMockSession(mockUser.$id, 'session-1');

  beforeEach(() => {
    jest.clearAllMocks();
    resetTestState();
    // Clear secure store
    Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);

    // Default: events fetch returns empty
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });
    mockFetchEventCounts.mockResolvedValue({ upcoming: 0, past: 0 });
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <GlobalProvider>{children}</GlobalProvider>;
  }

  it('should set user as logged in when session is valid', async () => {
    // Setup: tokens exist, session is valid
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetCurrentUserSessions.mockResolvedValue({
      total: 1,
      session: [mockSession],
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await flushPromises();
    });

    // After session validation, user should be logged in
    expect(result.current.isLogged).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(false);
  });

  it('should not log in when no access token exists', async () => {
    // Setup: no tokens
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetCurrentUserSessions.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should clear auth state when session is invalid', async () => {
    // Setup: tokens exist but session doesn't match
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetCurrentUserSessions.mockResolvedValue({
      total: 1,
      session: [createMockSession('different-user', 'session-2')],
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
    // Tokens should be cleared
    expect(mockSecureStore['access_token']).toBeUndefined();
    expect(mockSecureStore['session_id']).toBeUndefined();
  });

  it('should clear auth state when getCurrentUser fails', async () => {
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should clear auth state when clearAuthState is called (logout)', async () => {
    // Setup: start logged in
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

    // Now logout
    await act(async () => {
      await result.current.clearAuthState();
    });

    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.userEventCounts).toBeNull();
    expect(mockSecureStore['access_token']).toBeUndefined();
    expect(mockSecureStore['refresh_token']).toBeUndefined();
    expect(mockSecureStore['session_id']).toBeUndefined();
  });

  it('should register token expiration callback on mount', async () => {
    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(mockSetTokenExpirationCallback).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should load events cache on app start', async () => {
    const mockEvents = [
      {
        $id: 'event-1',
        id: 'event-1',
        title: 'Protest A',
        description: 'desc',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        $id: 'event-2',
        id: 'event-2',
        title: 'Protest B',
        description: 'desc',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 172800000).toISOString(),
      },
    ];

    mockGetEventsBackend.mockResolvedValue({
      events: mockEvents,
      total: 2,
      limit: 100,
      offset: 0,
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // Events cache should be populated as a map
    expect(Object.keys(result.current.eventsCache)).toHaveLength(2);
    expect(result.current.eventsCache['event-1'].title).toBe('Protest A');
    expect(result.current.eventsCache['event-2'].title).toBe('Protest B');
  });

  it('should refresh events when refetchEvents is called', async () => {
    mockGetEventsBackend
      .mockResolvedValueOnce({ events: [], total: 0, limit: 100, offset: 0 })
      .mockResolvedValueOnce({
        events: [
          {
            $id: 'new-event',
            id: 'new-event',
            title: 'New Event',
            description: 'desc',
            organizer_name: 'Org',
            country: 'BE',
            start_time: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(Object.keys(result.current.eventsCache)).toHaveLength(0);

    // Refetch
    await act(async () => {
      await result.current.refetchEvents();
    });

    expect(Object.keys(result.current.eventsCache)).toHaveLength(1);
    expect(result.current.eventsCache['new-event'].title).toBe('New Event');
  });

  it('should clear auth state when access token exists but session_id is missing', async () => {
    mockSecureStore['access_token'] = 'valid-token';
    // No session_id stored

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should clear auth state and show alert when token expiration fires', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
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

    // Get and fire the token expiration callback
    const tokenExpirationCallback = mockSetTokenExpirationCallback.mock.calls[0][0];

    await act(async () => {
      tokenExpirationCallback();
      await flushPromises();
    });

    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();

    // Alert should have been shown
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('should set user event counts when refreshUserEventCounts is called with org IDs', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockFetchEventCounts.mockResolvedValue({ upcoming: 5, past: 3 });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.userEventCounts).toBeNull();

    await act(async () => {
      await result.current.refreshUserEventCounts(['org-1', 'org-2']);
    });

    expect(result.current.userEventCounts).toEqual({ upcoming: 5, past: 3 });
    expect(mockFetchEventCounts).toHaveBeenCalledWith(['org-1', 'org-2']);
  });

  it('should set zero counts when refreshUserEventCounts is called with empty org IDs', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      await result.current.refreshUserEventCounts([]);
    });

    expect(result.current.userEventCounts).toEqual({ upcoming: 0, past: 0, draft: 0 });
    expect(mockFetchEventCounts).not.toHaveBeenCalled();
  });

  it('should keep stale counts when refreshUserEventCounts fails', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockFetchEventCounts
      .mockResolvedValueOnce({ upcoming: 5, past: 3 })
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // Set initial counts
    await act(async () => {
      await result.current.refreshUserEventCounts(['org-1']);
    });

    expect(result.current.userEventCounts).toEqual({ upcoming: 5, past: 3 });

    // Try refresh that fails
    await act(async () => {
      await result.current.refreshUserEventCounts(['org-1']);
    });

    // Stale data should be preserved
    expect(result.current.userEventCounts).toEqual({ upcoming: 5, past: 3 });
  });

  it('should load cached event counts from AsyncStorage on valid session', async () => {
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetCurrentUserSessions.mockResolvedValue({
      total: 1,
      session: [mockSession],
    });

    // Set up cached event counts in AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'userEventCounts') {
        return Promise.resolve(JSON.stringify({ upcoming: 10, past: 7 }));
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isLogged).toBe(true);
    expect(result.current.userEventCounts).toEqual({ upcoming: 10, past: 7 });
  });
});
