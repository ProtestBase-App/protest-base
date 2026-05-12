/**
 * Event CRUD Flow Integration Tests
 *
 * Wires real GlobalProvider with mocked API responses.
 * Tests: events cache initialization, refetch updates cache,
 * verifies the data flow that would have caught the race condition bug.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';
import {
  createMockEvent,
  createMockUser,
  createMockSession,
  flushPromises,
  resetTestState,
} from './test-utils';
import type { Event } from '@/types/event.types';

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
jest.mock('@/services/event.service', () => ({
  getEventsBackend: (...args: any[]) => mockGetEventsBackend(...args),
  fetchEventCounts: jest.fn(() => Promise.resolve({ upcoming: 0, past: 0 })),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: jest.fn(),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  __esModule: true,
  default: { alert: jest.fn() },
}));

// ============================================
// Tests
// ============================================

describe('Event CRUD Flow Integration', () => {
  let event1: Event;
  let event2: Event;
  let event3: Event;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTestState();
    Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);

    event1 = createMockEvent({ $id: 'e1', title: 'Climate March' });
    event2 = createMockEvent({ $id: 'e2', title: 'Peace Rally' });
    event3 = createMockEvent({ $id: 'e3', title: 'Education Protest' });
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <GlobalProvider>{children}</GlobalProvider>;
  }

  it('should populate events cache as a map from API response', async () => {
    mockGetEventsBackend.mockResolvedValue({
      events: [event1, event2],
      total: 2,
      limit: 100,
      offset: 0,
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // Cache should be a map with O(1) lookups
    expect(result.current.eventsCache['e1']).toBeDefined();
    expect(result.current.eventsCache['e2']).toBeDefined();
    expect(result.current.eventsCache['e1'].title).toBe('Climate March');
    expect(result.current.eventsCache['e2'].title).toBe('Peace Rally');
    expect(result.current.eventsLoading).toBe(false);
  });

  it('should replace entire cache on refetch (no stale data)', async () => {
    // Initial fetch: 2 events
    mockGetEventsBackend.mockResolvedValueOnce({
      events: [event1, event2],
      total: 2,
      limit: 100,
      offset: 0,
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(Object.keys(result.current.eventsCache)).toHaveLength(2);

    // After deletion on backend, refetch returns only 1 event
    mockGetEventsBackend.mockResolvedValueOnce({
      events: [event1],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await act(async () => {
      await result.current.refetchEvents();
    });

    // Cache should ONLY have event1 - event2 should be gone (no stale data)
    expect(Object.keys(result.current.eventsCache)).toHaveLength(1);
    expect(result.current.eventsCache['e1']).toBeDefined();
    expect(result.current.eventsCache['e2']).toBeUndefined();
  });

  it('should handle new events appearing after refetch', async () => {
    // Initial fetch: 2 events
    mockGetEventsBackend.mockResolvedValueOnce({
      events: [event1, event2],
      total: 2,
      limit: 100,
      offset: 0,
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // After creating a new event on backend, refetch returns 3 events
    mockGetEventsBackend.mockResolvedValueOnce({
      events: [event1, event2, event3],
      total: 3,
      limit: 100,
      offset: 0,
    });

    await act(async () => {
      await result.current.refetchEvents();
    });

    expect(Object.keys(result.current.eventsCache)).toHaveLength(3);
    expect(result.current.eventsCache['e3'].title).toBe('Education Protest');
  });

  it('should handle updated event data after refetch', async () => {
    mockGetEventsBackend.mockResolvedValueOnce({
      events: [event1],
      total: 1,
      limit: 100,
      offset: 0,
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.eventsCache['e1'].title).toBe('Climate March');

    // After edit on backend, refetch returns updated event
    const updatedEvent1 = { ...event1, title: 'Climate March (Updated)' };
    mockGetEventsBackend.mockResolvedValueOnce({
      events: [updatedEvent1],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await act(async () => {
      await result.current.refetchEvents();
    });

    expect(result.current.eventsCache['e1'].title).toBe('Climate March (Updated)');
  });

  it('should propagate refetch errors to caller', async () => {
    mockGetEventsBackend.mockResolvedValueOnce({
      events: [event1],
      total: 1,
      limit: 100,
      offset: 0,
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // Refetch fails
    mockGetEventsBackend.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      act(async () => {
        await result.current.refetchEvents();
      })
    ).rejects.toThrow('Network error');

    // eventsLoading should be false after error
    expect(result.current.eventsLoading).toBe(false);
  });

  it('should handle empty cache gracefully', async () => {
    mockGetEventsBackend.mockResolvedValue({
      events: [],
      total: 0,
      limit: 100,
      offset: 0,
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.eventsCache).toEqual({});
    expect(result.current.eventsLoading).toBe(false);
  });

  it('should show eventsLoading=true while initial fetch is pending', async () => {
    let resolveEvents: (value: any) => void;
    const eventsPromise = new Promise((resolve) => {
      resolveEvents = resolve;
    });

    mockGetEventsBackend.mockReturnValue(eventsPromise);

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    // eventsLoading should be true while fetch is pending
    expect(result.current.eventsLoading).toBe(true);

    // Resolve the fetch
    await act(async () => {
      resolveEvents!({ events: [event1], total: 1, limit: 100, offset: 0 });
      await flushPromises();
    });

    expect(result.current.eventsLoading).toBe(false);
    expect(result.current.eventsCache['e1']).toBeDefined();
  });

  it('should handle initial events fetch failure gracefully', async () => {
    mockGetEventsBackend.mockRejectedValue(new Error('API unavailable'));

    const { result } = renderHook(() => useGlobalContext(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // Cache should be empty, loading should be false
    expect(result.current.eventsCache).toEqual({});
    expect(result.current.eventsLoading).toBe(false);
  });
});
