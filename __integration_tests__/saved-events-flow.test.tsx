/**
 * Saved Events Flow Integration Tests
 *
 * Wires real GlobalProvider + SavedEventsProvider with mocked SecureStore +
 * AsyncStorage boundaries. Verifies persistence, migration from legacy
 * AsyncStorage data, retention-based cleanup, and optimistic updates.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SECURE_LIST_KEYS, STORAGE_KEYS } from '@/constants/StorageConfig';
import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';
import { SavedEventsProvider, useSavedEvents } from '@/context/SavedEventsProvider';
import {
  createMockEvent,
  flushPromises,
  resetTestState,
  waitFor as waitForCondition,
} from './test-utils';

// ============================================
// Mock ONLY the API/storage boundary
// ============================================

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { apiBaseUrl: 'http://test' } },
}));

jest.mock('@/services/auth.service', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve(null)),
  getCurrentUserSessions: jest.fn(() => Promise.resolve(null)),
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
  fetchEventCounts: jest.fn(() => Promise.resolve({ upcoming: 0, past: 0 })),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: jest.fn(),
}));

jest.mock('@/services/engagement.service', () => ({
  saveEventOnServer: jest.fn(() => Promise.resolve(1)),
  unsaveEventOnServer: jest.fn(() => Promise.resolve(0)),
  likeEventOnServer: jest.fn(() => Promise.resolve(1)),
  unlikeEventOnServer: jest.fn(() => Promise.resolve(0)),
  followOrganizationOnServer: jest.fn(() => Promise.resolve(1)),
  unfollowOrganizationOnServer: jest.fn(() => Promise.resolve(0)),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  __esModule: true,
  default: { alert: jest.fn() },
}));

// ============================================
// Tests
// ============================================

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Saved Events Flow Integration', () => {
  let secureStoreMem: Map<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTestState();
    secureStoreMem = new Map();
    mockGetEventByIdBackend.mockReset();
    // Default: hydration fetches reject with a generic error so existing tests
    // (which don't care about hydration) keep their saved entries intact —
    // SavedEventsProvider only deletes entries on `EventNotFoundError`. Tests
    // that need 404 or success behavior override per-call.
    mockGetEventByIdBackend.mockImplementation(async () => {
      throw new Error('hydration disabled for this test');
    });

    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) =>
      secureStoreMem.has(key) ? secureStoreMem.get(key)! : null
    );
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        secureStoreMem.set(key, value);
      }
    );
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      secureStoreMem.delete(key);
    });

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <GlobalProvider>
        <SavedEventsProvider>{children}</SavedEventsProvider>
      </GlobalProvider>
    );
  }

  function useTestHook() {
    const global = useGlobalContext();
    const saved = useSavedEvents();
    return { global, saved };
  }

  it('starts with empty saved events when no stored data', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.saved.savedEventIds).toEqual([]);
    expect(result.current.saved.loading).toBe(false);
  });

  it('loads previously saved event entries from SecureStore', async () => {
    const event1 = createMockEvent({ $id: 'saved-1' });
    const event2 = createMockEvent({ $id: 'saved-2' });

    mockGetEventsBackend.mockResolvedValue({
      events: [event1, event2],
      total: 2,
      limit: 100,
      offset: 0,
    });

    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([
        { id: 'saved-1', endsAt: Date.now() + DAY_MS },
        { id: 'saved-2', endsAt: Date.now() + DAY_MS },
      ])
    );

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.saved.savedEventIds).toContain('saved-1');
    expect(result.current.saved.savedEventIds).toContain('saved-2');
  });

  it('migrates legacy AsyncStorage savedEventIds on first read', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.SAVED_EVENT_IDS) {
        return JSON.stringify(['legacy-1', 'legacy-2']);
      }
      return null;
    });

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.saved.savedEventIds).toEqual(
      expect.arrayContaining(['legacy-1', 'legacy-2'])
    );

    // Legacy AsyncStorage key was removed
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.SAVED_EVENT_IDS);

    // Data is now in SecureStore (upgraded to entry shape)
    const stored = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS)!);
    expect(stored).toHaveLength(2);
    expect(stored[0]).toHaveProperty('endsAt');
  });

  it('saves an event with optimistic update and persists to SecureStore', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      await result.current.saved.saveEvent('new-event-1');
    });

    expect(result.current.saved.savedEventIds).toContain('new-event-1');
    expect(result.current.saved.isSaved('new-event-1')).toBe(true);

    // Persisted to SecureStore as a SavedEntry
    const stored = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS)!);
    expect(stored).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'new-event-1' })])
    );
  });

  it('unsaves an event with optimistic update', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([{ id: 'event-to-remove', endsAt: Date.now() + DAY_MS }])
    );

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.saved.isSaved('event-to-remove')).toBe(true);

    await act(async () => {
      await result.current.saved.unsaveEvent('event-to-remove');
    });

    expect(result.current.saved.isSaved('event-to-remove')).toBe(false);
    expect(result.current.saved.savedEventIds).not.toContain('event-to-remove');
  });

  it('does not duplicate when saving an already-saved event', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([{ id: 'existing-event', endsAt: Date.now() + DAY_MS }])
    );

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      await result.current.saved.saveEvent('existing-event');
    });

    const count = result.current.saved.savedEventIds.filter((id) => id === 'existing-event').length;
    expect(count).toBe(1);
  });

  it('cleans up entries with endsAt older than the 20-day retention window', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    const fresh = { id: 'fresh-event', endsAt: Date.now() - 5 * DAY_MS }; // ended 5d ago, within window
    const stale = { id: 'stale-event', endsAt: Date.now() - 21 * DAY_MS }; // ended 21d ago, prune

    secureStoreMem.set(SECURE_LIST_KEYS.SAVED_EVENT_IDS, JSON.stringify([fresh, stale]));

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.saved.savedEventIds).toContain('fresh-event');
    expect(result.current.saved.savedEventIds).not.toContain('stale-event');
  });

  it('keeps entries with far-future endsAt (covers deep-linked far-future saves)', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([{ id: 'far-future-event', endsAt: Date.now() + 365 * DAY_MS }])
    );

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.saved.savedEventIds).toContain('far-future-event');
  });

  it('handles corrupted SecureStore data gracefully', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    secureStoreMem.set(SECURE_LIST_KEYS.SAVED_EVENT_IDS, 'invalid-json{{{');

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.saved.savedEventIds).toEqual([]);
    expect(result.current.saved.loading).toBe(false);
  });

  it('hydrates a saved event missing from the global cache', async () => {
    // Bulk fetch returns nothing — simulates explore-pagination beyond the
    // cache window or a first session where the saved ID isn't in the recent
    // window.
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([{ id: 'far-future', endsAt: Date.now() + 90 * DAY_MS }])
    );

    const fetched = createMockEvent({ $id: 'far-future' });
    mockGetEventByIdBackend.mockReset();
    mockGetEventByIdBackend.mockResolvedValue(fetched);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(mockGetEventByIdBackend).toHaveBeenCalledWith('far-future');
    expect(result.current.global.eventsCache['far-future']).toBeDefined();
  });

  it('drops the saved entry when hydration returns 404', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([{ id: 'gone-event', endsAt: Date.now() + DAY_MS }])
    );

    mockGetEventByIdBackend.mockReset();
    mockGetEventByIdBackend.mockImplementation(async (id: string) => {
      throw new MockEventNotFoundError(id);
    });

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await waitForCondition(() => !result.current.saved.savedEventIds.includes('gone-event'));
    expect(result.current.saved.savedEventIds).not.toContain('gone-event');
  });

  it('correctly tracks isSaved through full save and unsave cycle', async () => {
    mockGetEventsBackend.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.saved.isSaved('cycle-event')).toBe(false);

    await act(async () => {
      await result.current.saved.saveEvent('cycle-event');
    });
    expect(result.current.saved.isSaved('cycle-event')).toBe(true);

    await act(async () => {
      await result.current.saved.unsaveEvent('cycle-event');
    });
    expect(result.current.saved.isSaved('cycle-event')).toBe(false);
  });
});
