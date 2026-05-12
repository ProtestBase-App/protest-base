/**
 * SavedEventsProvider Tests
 *
 * Focuses on branches NOT covered by the saved-events-flow integration tests:
 * - hook guard (useSavedEvents outside provider)
 * - fetchSavedEntriesLocally error path
 * - saveEvent rollback on error
 * - unsaveEvent rollback on error
 * - cleanup writes back when items are removed
 * - cleanup is purely arithmetic on stored endsAt (no eventsCache dependency)
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ============================================
// Mocks BEFORE imports
// ============================================

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
  expoConfig: { extra: {} },
}));

jest.mock('@/services/auth.service', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
  getCurrentUserSessions: jest.fn().mockResolvedValue(null),
}));

const mockGetEventsBackend = jest.fn();
const mockGetEventByIdBackend = jest.fn();

class MockEventNotFoundError extends Error {
  code = 'EVENT_NOT_FOUND' as const;
  constructor(eventId: string) {
    super(`Event with ID ${eventId} not found`);
    this.name = 'EventNotFoundError';
  }
}

jest.mock('@/services/event.service', () => ({
  getEventsBackend: (...args: any[]) => mockGetEventsBackend(...args),
  getEventByIdBackend: (...args: any[]) => mockGetEventByIdBackend(...args),
  EventNotFoundError: MockEventNotFoundError,
  fetchEventCounts: jest.fn().mockResolvedValue({ upcoming: 0, past: 0 }),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: jest.fn(),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({ alert: jest.fn() }));

// Mock localStorageService — only the entry-based functions used by the provider.
const mockFetchSavedEntriesLocally = jest.fn();
const mockWriteSavedEntriesLocally = jest.fn();
const mockAddSavedEntryLocally = jest.fn();
const mockRemoveSavedIdLocally = jest.fn();

jest.mock('@/services/localStorageService', () => ({
  fetchSavedEntriesLocally: (...args: any[]) => mockFetchSavedEntriesLocally(...args),
  writeSavedEntriesLocally: (...args: any[]) => mockWriteSavedEntriesLocally(...args),
  addSavedEntryLocally: (...args: any[]) => mockAddSavedEntryLocally(...args),
  removeSavedIdLocally: (...args: any[]) => mockRemoveSavedIdLocally(...args),
}));

// ============================================
// Imports after mocks
// ============================================

import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';
import { SavedEventsProvider, useSavedEvents } from '@/context/SavedEventsProvider';

// ============================================
// Helpers
// ============================================

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <GlobalProvider>
      <SavedEventsProvider>{children}</SavedEventsProvider>
    </GlobalProvider>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================
// Tests
// ============================================

describe('SavedEventsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });
    // Default: hydration fetches reject so existing tests (which never set up a
    // hydration scenario) leave saved entries intact. SavedEventsProvider only
    // removes entries on `EventNotFoundError`, so a generic rejection is safe.
    mockGetEventByIdBackend.mockRejectedValue(new Error('hydration disabled for this test'));
    mockFetchSavedEntriesLocally.mockResolvedValue([]);
    mockWriteSavedEntriesLocally.mockResolvedValue(undefined);
    mockAddSavedEntryLocally.mockResolvedValue(undefined);
    mockRemoveSavedIdLocally.mockResolvedValue(undefined);
  });

  it('should throw when useSavedEvents is used outside the provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useSavedEvents());
    }).toThrow('useSavedEvents must be used within a SavedEventsProvider');
    consoleSpy.mockRestore();
  });

  it('should start with loading=true', () => {
    const { result } = renderHook(() => useSavedEvents(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('should initialize to empty list when storage has no entries', async () => {
    mockFetchSavedEntriesLocally.mockResolvedValue([]);
    const { result } = renderHook(() => useSavedEvents(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.savedEventIds).toEqual([]);
  });

  it('should expose IDs from stored entries', async () => {
    const future = Date.now() + 7 * DAY_MS;
    mockFetchSavedEntriesLocally.mockResolvedValue([
      { id: 'event-a', endsAt: future },
      { id: 'event-b', endsAt: future },
    ]);

    const { result } = renderHook(() => useSavedEvents(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.savedEventIds).toContain('event-a');
    expect(result.current.savedEventIds).toContain('event-b');
  });

  it('should set empty list and loading=false when fetchSavedEntriesLocally throws', async () => {
    mockFetchSavedEntriesLocally.mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useSavedEvents(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.savedEventIds).toEqual([]);
  });

  it('should write the cleaned entries back when stale items are pruned', async () => {
    const stale = { id: 'old-event', endsAt: Date.now() - 21 * DAY_MS };
    const fresh = { id: 'future-event', endsAt: Date.now() + 7 * DAY_MS };
    mockFetchSavedEntriesLocally.mockResolvedValue([stale, fresh]);

    const { result } = renderHook(() => useSavedEvents(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.savedEventIds).toEqual(['future-event']);
    expect(mockWriteSavedEntriesLocally).toHaveBeenCalledWith([fresh]);
  });

  it('should NOT persist when no entries were pruned', async () => {
    const fresh = { id: 'future-event', endsAt: Date.now() + 7 * DAY_MS };
    mockFetchSavedEntriesLocally.mockResolvedValue([fresh]);

    const { result } = renderHook(() => useSavedEvents(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.savedEventIds).toContain('future-event');
    expect(mockWriteSavedEntriesLocally).not.toHaveBeenCalled();
  });

  it('should keep entries with far-future endsAt (covers the "not in cache" use case)', async () => {
    // The 1-year fallback ensures deep-linked far-future events survive cleanup.
    const farFuture = { id: 'far-event', endsAt: Date.now() + 365 * DAY_MS };
    mockFetchSavedEntriesLocally.mockResolvedValue([farFuture]);

    const { result } = renderHook(() => useSavedEvents(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.savedEventIds).toContain('far-event');
    expect(mockWriteSavedEntriesLocally).not.toHaveBeenCalled();
  });

  describe('saveEvent', () => {
    it('adds the event optimistically and uses the explicit endsAt', async () => {
      const { result } = renderHook(() => useSavedEvents(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.saveEvent('new-event', 99999);
      });

      expect(result.current.savedEventIds).toContain('new-event');
      expect(result.current.isSaved('new-event')).toBe(true);
      expect(mockAddSavedEntryLocally).toHaveBeenCalledWith({ id: 'new-event', endsAt: 99999 });
    });

    it('falls back to ~1-year endsAt when no arg and event not in cache', async () => {
      const before = Date.now();
      const { result } = renderHook(() => useSavedEvents(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.saveEvent('new-event');
      });

      const call = mockAddSavedEntryLocally.mock.calls[0][0];
      expect(call.id).toBe('new-event');
      expect(call.endsAt).toBeGreaterThanOrEqual(before + 364 * DAY_MS);
    });

    it('rolls back to storage state when addSavedEntryLocally fails', async () => {
      mockFetchSavedEntriesLocally.mockResolvedValue([
        { id: 'existing-event', endsAt: Date.now() + DAY_MS },
      ]);
      mockAddSavedEntryLocally.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useSavedEvents(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.savedEventIds).toContain('existing-event');

      await act(async () => {
        await result.current.saveEvent('new-event', 100);
      });

      // After rollback, savedEventIds reflects what storage returned
      expect(result.current.savedEventIds).toContain('existing-event');
      expect(result.current.savedEventIds).not.toContain('new-event');
    });
  });

  describe('unsaveEvent', () => {
    it('removes the event optimistically', async () => {
      mockFetchSavedEntriesLocally.mockResolvedValue([
        { id: 'event-to-remove', endsAt: Date.now() + DAY_MS },
      ]);

      const { result } = renderHook(() => useSavedEvents(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.unsaveEvent('event-to-remove');
      });

      expect(result.current.savedEventIds).not.toContain('event-to-remove');
      expect(result.current.isSaved('event-to-remove')).toBe(false);
    });

    it('rolls back to storage state when removeSavedIdLocally fails', async () => {
      mockFetchSavedEntriesLocally.mockResolvedValue([
        { id: 'event-to-remove', endsAt: Date.now() + DAY_MS },
      ]);
      mockRemoveSavedIdLocally.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useSavedEvents(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.savedEventIds).toContain('event-to-remove');

      await act(async () => {
        await result.current.unsaveEvent('event-to-remove');
      });

      expect(result.current.savedEventIds).toContain('event-to-remove');
    });
  });

  describe('isSaved', () => {
    it('returns false for an event not in the list', async () => {
      const { result } = renderHook(() => useSavedEvents(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isSaved('not-saved-event')).toBe(false);
    });

    it('returns true for an event in the list', async () => {
      mockFetchSavedEntriesLocally.mockResolvedValue([
        { id: 'saved-event', endsAt: Date.now() + DAY_MS },
      ]);
      const { result } = renderHook(() => useSavedEvents(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isSaved('saved-event')).toBe(true);
    });
  });

  describe('cache miss hydration', () => {
    function makeEvent(id: string) {
      const now = Date.now();
      return {
        $id: id,
        id,
        title: `Event ${id}`,
        description: '',
        country: 'belgium',
        start_time: new Date(now + DAY_MS).toISOString(),
        end_time: new Date(now + 2 * DAY_MS).toISOString(),
        organizer_name: 'Org',
      };
    }

    function useTestHook() {
      const saved = useSavedEvents();
      const global = useGlobalContext();
      return { saved, global };
    }

    it('fetches missing saved events and inserts them into the cache', async () => {
      mockFetchSavedEntriesLocally.mockResolvedValue([
        { id: 'missing-event', endsAt: Date.now() + DAY_MS },
      ]);
      const fetched = makeEvent('missing-event');
      mockGetEventByIdBackend.mockResolvedValue(fetched);

      const { result } = renderHook(() => useTestHook(), { wrapper });

      await waitFor(() => expect(result.current.saved.loading).toBe(false));
      await waitFor(() => expect(mockGetEventByIdBackend).toHaveBeenCalledWith('missing-event'));
      await waitFor(() => expect(result.current.global.eventsCache['missing-event']).toBeDefined());
    });

    it('drops the saved entry when hydration returns 404', async () => {
      mockFetchSavedEntriesLocally.mockResolvedValue([
        { id: 'deleted-event', endsAt: Date.now() + DAY_MS },
      ]);
      mockGetEventByIdBackend.mockRejectedValue(new MockEventNotFoundError('deleted-event'));

      const { result } = renderHook(() => useTestHook(), { wrapper });

      await waitFor(() => expect(result.current.saved.loading).toBe(false));
      await waitFor(() => expect(mockRemoveSavedIdLocally).toHaveBeenCalledWith('deleted-event'));
      await waitFor(() =>
        expect(result.current.saved.savedEventIds).not.toContain('deleted-event')
      );
    });

    it('keeps the saved entry on a non-404 error and logs', async () => {
      mockFetchSavedEntriesLocally.mockResolvedValue([
        { id: 'flaky-event', endsAt: Date.now() + DAY_MS },
      ]);
      mockGetEventByIdBackend.mockRejectedValue(new Error('Network blip'));

      const { result } = renderHook(() => useTestHook(), { wrapper });

      await waitFor(() => expect(result.current.saved.loading).toBe(false));
      await waitFor(() => expect(mockGetEventByIdBackend).toHaveBeenCalled());
      // Saved entry NOT removed, eventsCache NOT seeded.
      expect(mockRemoveSavedIdLocally).not.toHaveBeenCalledWith('flaky-event');
      expect(result.current.saved.savedEventIds).toContain('flaky-event');
    });

    it('skips hydration when the event is already in the cache', async () => {
      const cached = makeEvent('cached-event');
      mockGetEventsBackend.mockResolvedValue({
        events: [cached],
        total: 1,
        limit: 100,
        offset: 0,
      });
      mockFetchSavedEntriesLocally.mockResolvedValue([
        { id: 'cached-event', endsAt: Date.now() + DAY_MS },
      ]);

      const { result } = renderHook(() => useTestHook(), { wrapper });

      await waitFor(() => expect(result.current.saved.loading).toBe(false));
      await waitFor(() => expect(result.current.global.eventsCache['cached-event']).toBeDefined());
      expect(mockGetEventByIdBackend).not.toHaveBeenCalled();
    });
  });
});
