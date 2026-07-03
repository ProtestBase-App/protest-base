/**
 * GlobalProvider Tests
 *
 * Focuses on branches NOT covered by the auth-flow integration tests:
 * - No session_id in SecureStore
 * - No sessions array from backend
 * - Cached event counts loaded on valid session
 * - refreshUserEventCounts with no orgs (zero counts path)
 * - refreshUserEventCounts with orgs (API call path)
 * - refreshUserEventCounts error handling
 * - refetchEvents error re-throw
 * - Token expiration alert callback
 * - clearAuthState storage error path
 * - useGlobalContext hook guard
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Mocks BEFORE imports
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
  default: { expoConfig: { extra: {} } },
  expoConfig: { extra: {} },
}));

const mockGetCurrentUser = jest.fn();
const mockGetCurrentUserSessions = jest.fn();
jest.mock('@/services/auth.service', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  getCurrentUserSessions: (...args: any[]) => mockGetCurrentUserSessions(...args),
}));

const mockGetEventsBackend = jest.fn();
const mockFetchEventCounts = jest.fn();
jest.mock('@/services/event.service', () => ({
  getEventsBackend: (...args: any[]) => mockGetEventsBackend(...args),
  fetchEventCounts: (...args: any[]) => mockFetchEventCounts(...args),
}));

const mockLoadPersistedEvents = jest.fn();
const mockPersistEvents = jest.fn();
jest.mock('@/services/eventsCacheStorage', () => ({
  loadPersistedEvents: (...args: any[]) => mockLoadPersistedEvents(...args),
  persistEvents: (...args: any[]) => mockPersistEvents(...args),
}));

const mockSetTokenExpirationCallback = jest.fn();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: (...args: any[]) => mockSetTokenExpirationCallback(...args),
}));

// expo-router mock (needed for token expiration handler navigation)
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

// ============================================
// Imports after mocks
// ============================================

import { Alert } from 'react-native';
import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';

// ============================================
// Helpers
// ============================================

function wrapper({ children }: { children: React.ReactNode }) {
  return <GlobalProvider>{children}</GlobalProvider>;
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function createMockUser() {
  return {
    $id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerification: true,
    status: true,
    registration: '2024-01-01T00:00:00.000Z',
  };
}

function createMockSession(userId: string, sessionId: string) {
  return { $id: sessionId, userId, expire: new Date(Date.now() + 86400000).toISOString() };
}

// ============================================
// Tests
// ============================================

describe('GlobalProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });
    mockFetchEventCounts.mockResolvedValue({ upcoming: 0, past: 0 });
    mockLoadPersistedEvents.mockResolvedValue(null);
    mockPersistEvents.mockResolvedValue(undefined);
    // Restore getLocales default after clearAllMocks resets it
    const { getLocales } = require('expo-localization');
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'en' }]);
  });

  it('should throw when useGlobalContext is used outside the provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useGlobalContext());
    }).toThrow('useGlobalContext must be used within a GlobalProvider');
    consoleSpy.mockRestore();
  });

  it('should clear auth when access_token exists but session_id is missing', async () => {
    mockSecureStore['access_token'] = 'valid-token';
    // no session_id in store
    mockGetCurrentUser.mockResolvedValue(createMockUser());

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await flushPromises();

    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    // getCurrentUser should NOT have been called
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('should clear auth when getCurrentUser returns null', async () => {
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await flushPromises();

    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should clear auth when sessions.session is falsy', async () => {
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockResolvedValue(createMockUser());
    mockGetCurrentUserSessions.mockResolvedValue({ total: 0 }); // no .session property

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await flushPromises();

    expect(result.current.isLogged).toBe(false);
  });

  it('should load cached event counts from AsyncStorage when session is valid', async () => {
    const mockUser = createMockUser();
    const mockSession = createMockSession(mockUser.$id, 'session-1');
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetCurrentUserSessions.mockResolvedValue({ total: 1, session: [mockSession] });

    const cachedCounts = { upcoming: 5, past: 3 };
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'userEventCounts') return Promise.resolve(JSON.stringify(cachedCounts));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await flushPromises();

    expect(result.current.isLogged).toBe(true);
    expect(result.current.userEventCounts).toEqual(cachedCounts);
  });

  it('should handle AsyncStorage error when loading cached counts gracefully', async () => {
    const mockUser = createMockUser();
    const mockSession = createMockSession(mockUser.$id, 'session-1');
    mockSecureStore['access_token'] = 'valid-token';
    mockSecureStore['session_id'] = 'session-1';
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetCurrentUserSessions.mockResolvedValue({ total: 1, session: [mockSession] });

    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await flushPromises();

    // Should still log in despite storage error
    expect(result.current.isLogged).toBe(true);
    expect(result.current.userEventCounts).toBeNull();
  });

  describe('refreshUserEventCounts', () => {
    it('should set zero counts when no organizationIds provided', async () => {
      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      await act(async () => {
        await result.current.refreshUserEventCounts([]);
      });

      expect(result.current.userEventCounts).toEqual({ upcoming: 0, past: 0, draft: 0 });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'userEventCounts',
        JSON.stringify({ upcoming: 0, past: 0, draft: 0 })
      );
      expect(mockFetchEventCounts).not.toHaveBeenCalled();
    });

    it('should set zero counts when organizationIds is undefined', async () => {
      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      await act(async () => {
        await result.current.refreshUserEventCounts(undefined);
      });

      expect(result.current.userEventCounts).toEqual({ upcoming: 0, past: 0, draft: 0 });
    });

    it('should call fetchEventCounts and update state when orgs provided', async () => {
      mockFetchEventCounts.mockResolvedValue({ upcoming: 7, past: 2 });

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      await act(async () => {
        await result.current.refreshUserEventCounts(['org-1', 'org-2']);
      });

      expect(mockFetchEventCounts).toHaveBeenCalledWith(['org-1', 'org-2']);
      expect(result.current.userEventCounts).toEqual({ upcoming: 7, past: 2 });
    });

    it('should persist counts to AsyncStorage when orgs provided', async () => {
      const counts = { upcoming: 3, past: 1 };
      mockFetchEventCounts.mockResolvedValue(counts);

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      await act(async () => {
        await result.current.refreshUserEventCounts(['org-1']);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('userEventCounts', JSON.stringify(counts));
    });

    it('should set userEventCountsLoading during fetch', async () => {
      let resolveCount: (v: any) => void;
      mockFetchEventCounts.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCount = resolve;
          })
      );

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      act(() => {
        result.current.refreshUserEventCounts(['org-1']);
      });

      expect(result.current.userEventCountsLoading).toBe(true);

      await act(async () => {
        resolveCount!({ upcoming: 0, past: 0 });
      });

      expect(result.current.userEventCountsLoading).toBe(false);
    });

    it('should not clear existing counts when fetchEventCounts fails', async () => {
      // First set some counts
      mockFetchEventCounts.mockResolvedValueOnce({ upcoming: 4, past: 1 });

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      await act(async () => {
        await result.current.refreshUserEventCounts(['org-1']);
      });

      expect(result.current.userEventCounts).toEqual({ upcoming: 4, past: 1 });

      // Now fail
      mockFetchEventCounts.mockRejectedValueOnce(new Error('API error'));

      await act(async () => {
        await result.current.refreshUserEventCounts(['org-1']);
      });

      // Counts should remain stale (not cleared)
      expect(result.current.userEventCounts).toEqual({ upcoming: 4, past: 1 });
      expect(result.current.userEventCountsLoading).toBe(false);
    });
  });

  describe('refetchEvents', () => {
    it('should re-throw errors from getEventsBackend', async () => {
      mockGetEventsBackend
        .mockResolvedValueOnce({ events: [], total: 0, limit: 100, offset: 0 })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      await expect(
        act(async () => {
          await result.current.refetchEvents();
        })
      ).rejects.toThrow('Network error');

      // eventsLoading should be false after error
      expect(result.current.eventsLoading).toBe(false);
    });
  });

  describe('clearAuthState', () => {
    it('should clear SecureStore tokens on logout', async () => {
      mockSecureStore['access_token'] = 'valid-token';
      mockSecureStore['refresh_token'] = 'refresh-token';
      mockSecureStore['session_id'] = 'session-1';

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      await act(async () => {
        await result.current.clearAuthState();
      });

      expect(mockSecureStore['access_token']).toBeUndefined();
      expect(mockSecureStore['refresh_token']).toBeUndefined();
      expect(mockSecureStore['session_id']).toBeUndefined();
    });

    it('should clear all user data from AsyncStorage via multiRemove', async () => {
      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      await act(async () => {
        await result.current.clearAuthState();
      });

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['userEventCounts', 'savedEventIds', 'eventDraft'])
      );
    });

    it('should handle storage errors in clearAuthState gracefully', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      // Should not throw
      await expect(
        act(async () => {
          await result.current.clearAuthState();
        })
      ).resolves.not.toThrow();

      // State should still be cleared
      expect(result.current.isLogged).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.userEventCounts).toBeNull();
    });
  });

  describe('session validation - invalid session match (lines 203-207)', () => {
    it('should clear auth when session exists but userId does not match current user', async () => {
      // Arrange: session_id exists and getCurrentUser returns a user,
      // but the session's userId does NOT match the current user's $id.
      // This hits the else branch at line 203 (isValidSession === false).
      const mockUser = createMockUser(); // userId: 'user-1'
      const otherUserId = 'user-2'; // Different user's session
      const session = {
        $id: 'session-1',
        userId: otherUserId, // Mismatch!
        expire: new Date(Date.now() + 86400000).toISOString(),
      };
      mockSecureStore['access_token'] = 'valid-token';
      mockSecureStore['session_id'] = 'session-1';
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetCurrentUserSessions.mockResolvedValue({ total: 1, session: [session] });

      const { result } = renderHook(() => useGlobalContext(), { wrapper });

      await flushPromises();

      expect(result.current.isLogged).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should clear auth when session $id does not match stored session_id', async () => {
      // Session exists but $id doesn't match the stored session_id
      const mockUser = createMockUser();
      const session = {
        $id: 'different-session-id', // Doesn't match stored 'session-1'
        userId: mockUser.$id,
        expire: new Date(Date.now() + 86400000).toISOString(),
      };
      mockSecureStore['access_token'] = 'valid-token';
      mockSecureStore['session_id'] = 'session-1';
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetCurrentUserSessions.mockResolvedValue({ total: 1, session: [session] });

      const { result } = renderHook(() => useGlobalContext(), { wrapper });

      await flushPromises();

      expect(result.current.isLogged).toBe(false);
    });

    it('should clear auth when getCurrentUserSessions throws (outer catch, lines 205-207)', async () => {
      // getCurrentUserSessions throws — triggers the outer catch block
      mockSecureStore['access_token'] = 'valid-token';
      mockSecureStore['session_id'] = 'session-1';
      mockGetCurrentUser.mockResolvedValue(createMockUser());
      mockGetCurrentUserSessions.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGlobalContext(), { wrapper });

      await flushPromises();

      expect(result.current.isLogged).toBe(false);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('initial events fetch with actual events (line 253)', () => {
    it('should populate eventsCache when getEventsBackend returns events', async () => {
      const event = {
        $id: 'event-1',
        id: 'event-1',
        title: 'Test Event',
        description: 'Test',
        organizer_name: 'Test Org',
        country: 'BE',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      };
      // Return events on the initial fetch
      mockGetEventsBackend.mockResolvedValue({ events: [event], total: 1, limit: 100, offset: 0 });

      const { result } = renderHook(() => useGlobalContext(), { wrapper });

      await flushPromises();
      await flushPromises();

      // eventsCache should contain the event
      expect(result.current.eventsCache['event-1']).toBeDefined();
      expect(result.current.eventsCache['event-1'].title).toBe('Test Event');
    });

    it('should log error and set eventsLoading=false when initial fetch fails (line 259)', async () => {
      mockGetEventsBackend.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useGlobalContext(), { wrapper });

      await flushPromises();
      await flushPromises();

      // eventsCache remains empty but does not throw
      expect(result.current.eventsCache).toEqual({});
      expect(result.current.eventsLoading).toBe(false);
    });
  });

  describe('refetchEvents success path with events (lines 281-286)', () => {
    it('should update eventsCache with new events returned by refetchEvents', async () => {
      const event1 = {
        $id: 'event-1',
        id: 'event-1',
        title: 'Original Event',
        description: 'desc',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      };
      const event2 = {
        $id: 'event-2',
        id: 'event-2',
        title: 'New Event',
        description: 'desc',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 172800000).toISOString(),
      };

      // Initial fetch returns empty
      mockGetEventsBackend
        .mockResolvedValueOnce({ events: [], total: 0, limit: 100, offset: 0 })
        // refetchEvents returns both events
        .mockResolvedValueOnce({ events: [event1, event2], total: 2, limit: 100, offset: 0 });

      const { result } = renderHook(() => useGlobalContext(), { wrapper });

      await flushPromises();
      await flushPromises();

      await act(async () => {
        await result.current.refetchEvents();
      });

      expect(result.current.eventsCache['event-1']).toBeDefined();
      expect(result.current.eventsCache['event-2']).toBeDefined();
      expect(result.current.eventsLoading).toBe(false);
    });
  });

  describe('events cache: single-page fetch (#2) + stale-while-revalidate (#3)', () => {
    it('fetches the whole browse window in one request at the max limit', async () => {
      renderHook(() => useGlobalContext(), { wrapper });

      await flushPromises();
      await flushPromises();

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 500, offset: 0, includeEnded: true }),
        // Large single-response fetch gets a longer budget than the 10s default.
        expect.objectContaining({ timeout: expect.any(Number) })
      );
      // Single page — the old up-to-5-call waterfall is gone.
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(1);
    });

    it('preserves out-of-window upserted events across a wholesale refetch', async () => {
      const freshEvent = {
        $id: 'fresh',
        id: 'fresh',
        title: 'Fresh',
        description: '',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      };
      mockGetEventsBackend.mockResolvedValue({
        events: [freshEvent],
        total: 1,
        limit: 500,
        offset: 0,
      });

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();
      await flushPromises();

      // A deep-linked past event (older than the 20-day lookback) warmed into
      // the cache by the detail screen.
      const oldEvent = {
        $id: 'old-deep-link',
        id: 'old-deep-link',
        title: 'Old',
        description: '',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() - 30 * 86400000).toISOString(),
      };
      act(() => {
        result.current.upsertEventInCache(oldEvent as any);
      });

      await act(async () => {
        await result.current.refetchEvents();
      });

      // The wholesale replace keeps the entry the fetch window cannot see...
      expect(result.current.eventsCache['old-deep-link']).toBeDefined();
      expect(result.current.eventsCache['fresh']).toBeDefined();
    });

    it('re-persists the snapshot when a screen upserts after a fresh fetch', async () => {
      const event = {
        $id: 'e1',
        id: 'e1',
        title: 'E',
        description: '',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      };
      mockGetEventsBackend.mockResolvedValue({ events: [event], total: 1, limit: 500, offset: 0 });

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();
      await flushPromises();
      mockPersistEvents.mockClear();

      const created = {
        $id: 'created-now',
        id: 'created-now',
        title: 'Created',
        description: '',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 2 * 86400000).toISOString(),
      };
      act(() => {
        result.current.upsertEventInCache(created as any);
      });
      await flushPromises();

      expect(mockPersistEvents).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ $id: 'created-now' })])
      );
    });

    it('hydrates eventsCache from the persisted snapshot before the network fetch resolves', async () => {
      const persisted = {
        $id: 'p1',
        id: 'p1',
        title: 'Persisted',
        description: '',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      };
      mockLoadPersistedEvents.mockResolvedValue([persisted]);

      let resolveFetch: (value: any) => void = () => {};
      mockGetEventsBackend.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const { result } = renderHook(() => useGlobalContext(), { wrapper });

      await flushPromises();

      // Painted from persistence while the network fetch is still pending.
      expect(result.current.eventsCache['p1']).toBeDefined();

      const fresh = {
        $id: 'fresh',
        id: 'fresh',
        title: 'Fresh',
        description: '',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 172800000).toISOString(),
      };
      await act(async () => {
        resolveFetch({ events: [fresh], total: 1, limit: 500, offset: 0 });
      });

      // Fresh fetch replaces the persisted snapshot wholesale.
      expect(result.current.eventsCache['fresh']).toBeDefined();
      expect(result.current.eventsCache['p1']).toBeUndefined();
    });

    it('persists events after a successful initial fetch', async () => {
      const event = {
        $id: 'e1',
        id: 'e1',
        title: 'E',
        description: '',
        organizer_name: 'Org',
        country: 'BE',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      };
      mockGetEventsBackend.mockResolvedValue({ events: [event], total: 1, limit: 500, offset: 0 });

      renderHook(() => useGlobalContext(), { wrapper });

      await flushPromises();
      await flushPromises();

      expect(mockPersistEvents).toHaveBeenCalledWith([event]);
    });
  });

  describe('token expiration callback', () => {
    it('should show alert and clear auth when token expiration fires', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      // Get the registered callback
      expect(mockSetTokenExpirationCallback).toHaveBeenCalledWith(expect.any(Function));
      const expirationCallback = mockSetTokenExpirationCallback.mock.calls[0][0];

      // Trigger expiration
      await act(async () => {
        expirationCallback();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(alertSpy).toHaveBeenCalled();
      expect(result.current.isLogged).toBe(false);
      expect(result.current.user).toBeNull();
      alertSpy.mockRestore();
    });
  });

  describe('userLanguage', () => {
    it('should default to "en" when locale is unknown', async () => {
      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();
      expect(result.current.userLanguage).toBe('en');
    });

    it('should fall back to "en" when locale is an unsupported language (line 104 false branch)', async () => {
      // 'de' is not in supportedLanguages — triggers the ': "en"' fallback.
      // We override mockReturnValue (set in beforeEach) with the unsupported locale.
      const { getLocales } = require('expo-localization');
      (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'de' }]);

      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      expect(result.current.userLanguage).toBe('en');
    });
  });

  describe('setters exposed in context', () => {
    it('should allow directly setting isLogged via setIsLogged', async () => {
      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      act(() => {
        result.current.setIsLogged(true);
      });

      expect(result.current.isLogged).toBe(true);
    });

    it('should allow directly setting loading via setLoading', async () => {
      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('should allow directly setting user via setUser', async () => {
      const mockUser = createMockUser();
      const { result } = renderHook(() => useGlobalContext(), { wrapper });
      await flushPromises();

      act(() => {
        result.current.setUser(mockUser as any);
      });

      expect(result.current.user).toEqual(mockUser);
    });
  });
});
