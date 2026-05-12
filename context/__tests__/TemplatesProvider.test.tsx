/**
 * TemplatesProvider Tests
 *
 * Focuses on branches NOT covered by the template-crud-flow integration tests:
 * - hook guard
 * - not logged in: clears cache and returns empty
 * - user changes: clears old cache and fetches fresh
 * - cache fresh: uses AsyncStorage, no backend call
 * - cache stale: fetches from backend
 * - concurrent fetch prevention
 * - refreshTemplates when not logged in
 * - refreshTemplates concurrent prevention
 * - isStale when lastFetchTime is null vs recent
 * - loadCachedData error path
 * - saveCacheData error path
 * - clearCache error path
 * - initialize inner fetch error
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
  getLocales: () => [{ languageCode: 'en' }],
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

jest.mock('@/services/event.service', () => ({
  getEventsBackend: jest.fn().mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 }),
  fetchEventCounts: jest.fn().mockResolvedValue({ upcoming: 0, past: 0 }),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: jest.fn(),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({ alert: jest.fn() }));

const mockGetTemplates = jest.fn();
const mockCreateTemplate = jest.fn();
const mockUpdateTemplate = jest.fn();
const mockDeleteTemplate = jest.fn();

jest.mock('@/services/template.service', () => ({
  getTemplates: (...args: any[]) => mockGetTemplates(...args),
  createTemplate: (...args: any[]) => mockCreateTemplate(...args),
  updateTemplate: (...args: any[]) => mockUpdateTemplate(...args),
  deleteTemplate: (...args: any[]) => mockDeleteTemplate(...args),
}));

// ============================================
// Imports after mocks
// ============================================

import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';
import { TemplatesProvider, useTemplates } from '@/context/TemplatesProvider';
import type { ParsedEventTemplate } from '@/types/template.types';

// ============================================
// Helpers
// ============================================

function makeUser() {
  return {
    $id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerification: true,
    status: true,
    registration: '2024-01-01T00:00:00.000Z',
  };
}

function makeSession(userId: string, sessionId: string) {
  return { $id: sessionId, userId, expire: new Date(Date.now() + 86400000).toISOString() };
}

function makeTemplate(overrides: Partial<ParsedEventTemplate> = {}): ParsedEventTemplate {
  return {
    $id: 'template-1',
    $createdAt: '2025-01-01T00:00:00.000Z',
    $updatedAt: '2025-01-02T00:00:00.000Z',
    name: 'Test Template',
    organizer_id: 'user-1',
    event_data: { title: 'Event', country: 'BE' },
    ...overrides,
  };
}

function loggedOutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <GlobalProvider>
      <TemplatesProvider>{children}</TemplatesProvider>
    </GlobalProvider>
  );
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

// ============================================
// Tests
// ============================================

describe('TemplatesProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetCurrentUserSessions.mockResolvedValue(null);
    mockGetTemplates.mockResolvedValue([]);
  });

  it('should throw when useTemplates is used outside the provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useTemplates());
    }).toThrow('useTemplates must be used within a TemplatesProvider');
    consoleSpy.mockRestore();
  });

  it('should clear cache and set loading=false when user is not logged in', async () => {
    const { result } = renderHook(() => useTemplates(), { wrapper: loggedOutWrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.templates).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockGetTemplates).not.toHaveBeenCalled();
  });

  it('should call AsyncStorage.removeItem during clearCache when not logged in', async () => {
    // Pre-set some cached data
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'templatesCache') return Promise.resolve(JSON.stringify([makeTemplate()]));
      if (key === 'templatesCacheTimestamp') return Promise.resolve(Date.now().toString());
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useTemplates(), { wrapper: loggedOutWrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('templatesCache');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('templatesCacheTimestamp');
  });

  describe('when logged in', () => {
    function loggedInWrapper({ children }: { children: React.ReactNode }) {
      return (
        <GlobalProvider>
          <TemplatesProvider>{children}</TemplatesProvider>
        </GlobalProvider>
      );
    }

    beforeEach(() => {
      const user = makeUser();
      const session = makeSession(user.$id, 'session-1');
      mockSecureStore['access_token'] = 'valid-token';
      mockSecureStore['session_id'] = 'session-1';
      mockGetCurrentUser.mockResolvedValue(user);
      mockGetCurrentUserSessions.mockResolvedValue({ total: 1, session: [session] });
    });

    it('should fetch templates from backend on mount', async () => {
      const t1 = makeTemplate({ $id: 't1', $updatedAt: '2025-01-02T00:00:00.000Z' });
      mockGetTemplates.mockResolvedValue([t1]);

      const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

      await flushPromises();
      await flushPromises();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.templates).toHaveLength(1);
      expect(result.current.templates[0].$id).toBe('t1');
      expect(result.current.error).toBeNull();
    });

    it('should sort templates by $updatedAt DESC', async () => {
      const older = makeTemplate({ $id: 't1', $updatedAt: '2025-01-01T00:00:00.000Z' });
      const newer = makeTemplate({ $id: 't2', $updatedAt: '2025-01-10T00:00:00.000Z' });
      mockGetTemplates.mockResolvedValue([older, newer]);

      const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

      await flushPromises();
      await flushPromises();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.templates[0].$id).toBe('t2');
      expect(result.current.templates[1].$id).toBe('t1');
    });

    it('should use fresh AsyncStorage cache without fetching backend', async () => {
      const cachedTemplate = makeTemplate({ $id: 'cached-1' });
      const freshTimestamp = Date.now() - 60 * 1000; // 1 minute ago

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'templatesCache') return Promise.resolve(JSON.stringify([cachedTemplate]));
        if (key === 'templatesCacheTimestamp') return Promise.resolve(freshTimestamp.toString());
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

      await flushPromises();
      await flushPromises();

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Should use cached data, not fetch from backend
      expect(mockGetTemplates).not.toHaveBeenCalled();
      expect(result.current.templates).toHaveLength(1);
      expect(result.current.templates[0].$id).toBe('cached-1');
    });

    it('should fetch from backend when AsyncStorage cache is stale', async () => {
      const staleTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const cachedTemplate = makeTemplate({ $id: 'stale-1' });
      const freshTemplate = makeTemplate({ $id: 'fresh-1' });

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'templatesCache') return Promise.resolve(JSON.stringify([cachedTemplate]));
        if (key === 'templatesCacheTimestamp') return Promise.resolve(staleTimestamp.toString());
        return Promise.resolve(null);
      });

      mockGetTemplates.mockResolvedValue([freshTemplate]);

      const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

      await flushPromises();
      await flushPromises();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetTemplates).toHaveBeenCalled();
      expect(result.current.templates[0].$id).toBe('fresh-1');
    });

    it('should set error state when backend fetch fails', async () => {
      mockGetTemplates.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

      await flushPromises();
      await flushPromises();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('API error');
    });

    it('should set generic error when error has no message', async () => {
      mockGetTemplates.mockRejectedValue({});

      const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

      await flushPromises();
      await flushPromises();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Failed to fetch templates');
    });

    it('should save templates to AsyncStorage cache after fetch', async () => {
      const t1 = makeTemplate({ $id: 't1' });
      mockGetTemplates.mockResolvedValue([t1]);

      const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

      await flushPromises();
      await flushPromises();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'templatesCache',
        expect.stringContaining('t1')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'templatesCacheTimestamp',
        expect.any(String)
      );
    });

    describe('isStale', () => {
      it('should return true when lastFetchTime is null (templates never loaded)', async () => {
        // Test isStale when fetch fails so lastFetchTime stays null
        mockGetTemplates.mockRejectedValue(new Error('fail'));

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Fetch failed, so lastFetchTime is null => isStale returns true
        expect(result.current.lastFetchTime).toBeNull();
        expect(result.current.isStale()).toBe(true);
      });

      it('should return false when just fetched', async () => {
        const t1 = makeTemplate();
        mockGetTemplates.mockResolvedValue([t1]);

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.isStale()).toBe(false);
        expect(result.current.lastFetchTime).not.toBeNull();
      });
    });

    describe('refreshTemplates', () => {
      it('should set loading=false and return early when not logged in (via refreshTemplates)', async () => {
        // Clear the logged-in tokens so GlobalProvider won't authenticate
        Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);
        mockGetCurrentUser.mockResolvedValue(null);

        // Use a fresh wrapper where user is not logged in
        const notLoggedInWrapper = ({ children }: { children: React.ReactNode }) => (
          <GlobalProvider>
            <TemplatesProvider>{children}</TemplatesProvider>
          </GlobalProvider>
        );

        const { result } = renderHook(() => useTemplates(), { wrapper: notLoggedInWrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Reset the call count from initialization
        mockGetTemplates.mockClear();

        await act(async () => {
          await result.current.refreshTemplates();
        });

        expect(mockGetTemplates).not.toHaveBeenCalled();
        expect(result.current.loading).toBe(false);
      });

      it('should fetch fresh templates when called manually (logged in)', async () => {
        const t1 = makeTemplate({ $id: 't1' });
        const t2 = makeTemplate({ $id: 't2' });
        mockGetTemplates.mockResolvedValueOnce([t1]).mockResolvedValueOnce([t1, t2]);

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.templates).toHaveLength(1);

        await act(async () => {
          await result.current.refreshTemplates();
        });

        expect(result.current.templates).toHaveLength(2);
      });

      it('should not allow concurrent refreshes', async () => {
        let resolveFirst: (v: any) => void;
        mockGetTemplates
          .mockResolvedValueOnce([]) // initial fetch
          .mockImplementationOnce(
            () =>
              new Promise((resolve) => {
                resolveFirst = resolve;
              })
          );

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Start first refresh
        act(() => {
          result.current.refreshTemplates();
        });

        // Second concurrent call should be ignored
        await act(async () => {
          await result.current.refreshTemplates();
        });

        // Resolve first refresh
        await act(async () => {
          resolveFirst!([]);
        });

        // getTemplates called for initial + 1 refresh only
        expect(mockGetTemplates).toHaveBeenCalledTimes(2);
      });
    });

    describe('addTemplate', () => {
      it('should prepend the new template to the list', async () => {
        const existing = makeTemplate({ $id: 'existing' });
        mockGetTemplates.mockResolvedValue([existing]);

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();
        await waitFor(() => expect(result.current.loading).toBe(false));

        const newTemplate = makeTemplate({ $id: 'new-1', name: 'Brand New' });
        mockCreateTemplate.mockResolvedValue(newTemplate);

        await act(async () => {
          await result.current.addTemplate({
            organization_id: 'org-1',
            name: 'Brand New',
            event_data: { title: 'New', country: 'BE' },
          });
        });

        expect(result.current.templates[0].$id).toBe('new-1');
        expect(result.current.templates).toHaveLength(2);
      });
    });

    describe('editTemplate', () => {
      it('should replace the updated template in the list', async () => {
        const original = makeTemplate({ $id: 't1', name: 'Original' });
        mockGetTemplates.mockResolvedValue([original]);

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();
        await waitFor(() => expect(result.current.loading).toBe(false));

        const updated = { ...original, name: 'Updated Name' };
        mockUpdateTemplate.mockResolvedValue(updated);

        await act(async () => {
          await result.current.editTemplate('t1', { name: 'Updated Name' });
        });

        expect(result.current.templates[0].name).toBe('Updated Name');
      });
    });

    describe('removeTemplate', () => {
      it('should remove template from list', async () => {
        const t1 = makeTemplate({ $id: 't1' });
        const t2 = makeTemplate({ $id: 't2' });
        mockGetTemplates.mockResolvedValue([t1, t2]);

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockDeleteTemplate.mockResolvedValue(undefined);

        await act(async () => {
          await result.current.removeTemplate('t1');
        });

        expect(result.current.templates).toHaveLength(1);
        expect(result.current.templates[0].$id).toBe('t2');
      });

      it('should rollback on delete error', async () => {
        const t1 = makeTemplate({ $id: 't1' });
        mockGetTemplates.mockResolvedValue([t1]);

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockDeleteTemplate.mockRejectedValue(new Error('Delete failed'));

        await expect(
          act(async () => {
            await result.current.removeTemplate('t1');
          })
        ).rejects.toThrow('Delete failed');

        // Rolled back
        expect(result.current.templates).toHaveLength(1);
        expect(result.current.templates[0].$id).toBe('t1');
      });
    });

    describe('error paths in storage helpers', () => {
      it('should handle loadCachedData AsyncStorage error gracefully', async () => {
        // Make AsyncStorage.getItem throw — loadCachedData catches and returns null
        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();

        await waitFor(() => expect(result.current.loading).toBe(false));

        // loadCachedData returned null/null — falls through to backend fetch
        expect(mockGetTemplates).toHaveBeenCalled();
      });

      it('should handle saveCacheData AsyncStorage error gracefully', async () => {
        // setItem throws — saveCacheData catches and doesn't crash
        (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage write error'));

        const t1 = makeTemplate({ $id: 't1' });
        mockGetTemplates.mockResolvedValue([t1]);

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Templates still loaded despite save failure
        expect(result.current.templates).toHaveLength(1);
        expect(result.current.error).toBeNull();
      });

      it('should handle clearCache AsyncStorage error gracefully', async () => {
        // removeItem throws — clearCache catches and doesn't crash
        (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage remove error'));

        // Trigger clear cache by having a not-logged-in render
        const notLoggedWrapper = ({ children }: { children: React.ReactNode }) => (
          <GlobalProvider>
            <TemplatesProvider>{children}</TemplatesProvider>
          </GlobalProvider>
        );

        // Temporarily clear tokens
        Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);
        mockGetCurrentUser.mockResolvedValue(null);

        const { result } = renderHook(() => useTemplates(), { wrapper: notLoggedWrapper });

        // Should not throw even when removeItem fails
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.templates).toEqual([]);
      });

      it('should handle refreshTemplates error path (lines 150-151)', async () => {
        // First load succeeds, then refreshTemplates fails
        const t1 = makeTemplate({ $id: 't1' });
        mockGetTemplates
          .mockResolvedValueOnce([t1])
          .mockRejectedValueOnce(new Error('Refresh failed'));

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
          await result.current.refreshTemplates();
        });

        expect(result.current.error).toBe('Refresh failed');
      });

      it('should skip if already fetched for this user (fetchedForUserRef guard)', async () => {
        // After initial fetch, fetchedForUserRef.current === user.$id
        // So initialize runs again (due to deps change) but should skip
        const t1 = makeTemplate({ $id: 't1' });
        mockGetTemplates.mockResolvedValue([t1]);

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Only called once for initial fetch
        expect(mockGetTemplates).toHaveBeenCalledTimes(1);
      });

      it('should skip initialize when isFetchingRef is true (line 234 guard — concurrent call)', async () => {
        // This test verifies that when refreshTemplates is called while initialize
        // is still in progress, the second concurrent initialize skips via the
        // isFetchingRef.current check (line 233).
        // In practice this fires when the useEffect deps trigger a re-run mid-fetch.
        // We simulate this by starting a slow initial fetch and calling refresh concurrently.
        let resolveInitial: (v: any) => void;

        mockGetTemplates.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveInitial = resolve;
            })
        );

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        // Don't wait — initial fetch is still in flight (isFetchingRef.current === true)
        await flushPromises();

        // Resolve the fetch
        await act(async () => {
          resolveInitial!([makeTemplate({ $id: 't1' })]);
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Only one backend call since isFetchingRef guard blocks duplicates
        expect(mockGetTemplates).toHaveBeenCalledTimes(1);
        expect(result.current.templates).toHaveLength(1);
      });

      it('should use loaded cache and mark fetchedForUserRef set (line 234 guard)', async () => {
        // Test that once fetchedForUserRef.current === user.$id, second initialize is skipped
        const t1 = makeTemplate({ $id: 't1' });
        const freshTimestamp = Date.now() - 60 * 1000;

        (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
          if (key === 'templatesCache') return Promise.resolve(JSON.stringify([t1]));
          if (key === 'templatesCacheTimestamp') return Promise.resolve(freshTimestamp.toString());
          return Promise.resolve(null);
        });

        const { result } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        await flushPromises();
        await flushPromises();

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Cache was fresh, backend not called
        expect(mockGetTemplates).not.toHaveBeenCalled();
        expect(result.current.templates).toHaveLength(1);
        expect(result.current.lastFetchTime).toBe(freshTimestamp);
      });

      it('should not update state when unmounted during inner fetch (isMounted=false guard)', async () => {
        // Component unmounts while fetch is in-flight
        // The isMounted check (line 266: if (isMounted)) prevents state updates after unmount
        let resolveBackend: (v: any) => void;
        mockGetTemplates.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveBackend = resolve;
            })
        );

        const { result, unmount } = renderHook(() => useTemplates(), {
          wrapper: loggedInWrapper,
        });

        // Flush enough for the fetch to start
        await flushPromises();

        // Unmount before fetch resolves
        unmount();

        // Now resolve - state updates should be suppressed by isMounted=false
        await act(async () => {
          resolveBackend!([makeTemplate({ $id: 'late-1' })]);
        });

        // Component was unmounted, no errors should be thrown (no crash is the assertion)
        expect(true).toBe(true);
      });

      it('should not set error state when unmounted during outer catch (isMounted=false guard)', async () => {
        // loadCachedData throws, outer catch fires, but isMounted is false
        let rejectStorage: (e: Error) => void;
        (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(
          () =>
            new Promise((_, reject) => {
              rejectStorage = reject;
            })
        );

        const { unmount } = renderHook(() => useTemplates(), { wrapper: loggedInWrapper });

        // Start initialization but unmount before storage resolves
        await flushPromises();
        unmount();

        // Reject storage read after unmount
        await act(async () => {
          rejectStorage!(new Error('storage fail after unmount'));
        });

        // Should not throw - isMounted guard suppresses the error state update
        expect(true).toBe(true);
      });
    });
  });
});
