/**
 * GlobalProvider — launch events fetch
 *
 * Covers how the provider adopts the fetch that eventsBootstrap starts ahead of
 * the version/integrity gates. eventsBootstrap is mocked here (unlike in
 * GlobalProvider.test.tsx, which drives the real one through the API boundary)
 * so the speculative-failure paths can be produced deterministically.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Mocks BEFORE imports
// ============================================

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
  expoConfig: { extra: {} },
}));

jest.mock('@/services/auth.service', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve(null)),
  getCurrentUserSessions: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/services/event.service', () => ({
  getEventsBackend: jest.fn(),
  fetchEventCounts: jest.fn(() => Promise.resolve({ upcoming: 0, past: 0, draft: 0 })),
}));

const mockPersistEvents = jest.fn();
jest.mock('@/services/eventsCacheStorage', () => ({
  loadPersistedEvents: jest.fn(() => Promise.resolve(null)),
  persistEvents: (...args: any[]) => mockPersistEvents(...args),
}));

const mockClaimEventsFetch = jest.fn();
const mockFetchAllCacheableEvents = jest.fn();
jest.mock('@/services/eventsBootstrap', () => ({
  claimEventsFetch: () => mockClaimEventsFetch(),
  fetchAllCacheableEvents: (...args: any[]) => mockFetchAllCacheableEvents(...args),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

// ============================================
// Imports after mocks
// ============================================

import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';

function wrapper({ children }: { children: React.ReactNode }) {
  return <GlobalProvider>{children}</GlobalProvider>;
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function makeEvent(id: string) {
  return {
    $id: id,
    id,
    title: id,
    description: '',
    organizer_name: 'Org',
    country: 'BE',
    start_time: new Date(Date.now() + 86400000).toISOString(),
  };
}

function fetchResult(events: ReturnType<typeof makeEvent>[]) {
  return {
    events,
    lookbackDate: new Date(Date.now() - 86400000).toISOString(),
    truncated: false,
    notModified: false,
    etag: undefined,
  };
}

/** The shape eventsBootstrap.claimEventsFetch() hands back. */
function bootstrap(options: {
  result: Promise<any>;
  speculative: boolean;
  snapshot?: Promise<any>;
}) {
  const fetch = {
    snapshot: options.snapshot ?? Promise.resolve(null),
    result: options.result,
    speculative: options.speculative,
  };
  fetch.result.catch(() => {});
  return fetch;
}

const networkError = Object.assign(new Error('Network Error'), {
  isAxiosError: true,
  code: 'ECONNABORTED',
});

describe('GlobalProvider launch events fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    mockPersistEvents.mockResolvedValue(undefined);
  });

  it('adopts the prefetched request instead of starting another', async () => {
    mockClaimEventsFetch.mockReturnValue(
      bootstrap({ result: Promise.resolve(fetchResult([makeEvent('e1')])), speculative: true })
    );

    const { result } = renderHook(() => useGlobalContext(), { wrapper });
    await flushPromises();

    expect(result.current.eventsCache['e1']).toBeDefined();
    expect(mockClaimEventsFetch).toHaveBeenCalledTimes(1);
    // The claimed request is the only one — no second fetch alongside it.
    expect(mockFetchAllCacheableEvents).not.toHaveBeenCalled();
  });

  it('retries once when the speculative request fails for a non-network reason', async () => {
    // What a stale API prefix (404) or a not-yet-attested install token (401)
    // looks like: the request was simply issued too early.
    mockClaimEventsFetch.mockReturnValue(
      bootstrap({
        result: Promise.reject(new Error('Request failed with status code 404')),
        speculative: true,
      })
    );
    mockFetchAllCacheableEvents.mockResolvedValue(fetchResult([makeEvent('e1')]));

    const { result } = renderHook(() => useGlobalContext(), { wrapper });
    await flushPromises();

    expect(mockFetchAllCacheableEvents).toHaveBeenCalledTimes(1);
    expect(result.current.eventsCache['e1']).toBeDefined();
    // The speculative failure must never reach the user.
    expect(result.current.connectionError).toBe(false);
  });

  it('does not retry a speculative request that failed at the network level', async () => {
    mockClaimEventsFetch.mockReturnValue(
      bootstrap({ result: Promise.reject(networkError), speculative: true })
    );

    const { result } = renderHook(() => useGlobalContext(), { wrapper });
    await flushPromises();

    // Retrying would only fail again, and would double a 30s timeout offline.
    expect(mockFetchAllCacheableEvents).not.toHaveBeenCalled();
    expect(result.current.connectionError).toBe(true);
  });

  it('does not retry a request it started itself', async () => {
    mockClaimEventsFetch.mockReturnValue(
      bootstrap({
        result: Promise.reject(new Error('Request failed with status code 500')),
        speculative: false,
      })
    );

    const { result } = renderHook(() => useGlobalContext(), { wrapper });
    await flushPromises();

    expect(mockFetchAllCacheableEvents).not.toHaveBeenCalled();
    expect(result.current.eventsCache).toEqual({});
  });

  it('hydrates from the snapshot the claimed fetch already read', async () => {
    let resolveFetch: (value: any) => void = () => {};
    mockClaimEventsFetch.mockReturnValue(
      bootstrap({
        snapshot: Promise.resolve({ events: [makeEvent('p1')], etag: 'W/"abc"' }),
        result: new Promise((resolve) => {
          resolveFetch = resolve;
        }),
        speculative: true,
      })
    );

    const { result } = renderHook(() => useGlobalContext(), { wrapper });
    await flushPromises();

    // Painted from disk while the network request is still in flight.
    expect(result.current.eventsCache['p1']).toBeDefined();

    await act(async () => {
      resolveFetch(fetchResult([makeEvent('e1')]));
    });

    expect(result.current.eventsCache['e1']).toBeDefined();
  });

  it('still persists a screen upsert that landed while the snapshot was loading', async () => {
    let resolveSnapshot: (value: any) => void = () => {};
    mockClaimEventsFetch.mockReturnValue(
      bootstrap({
        snapshot: new Promise((resolve) => {
          resolveSnapshot = resolve;
        }),
        result: Promise.resolve({
          events: [],
          lookbackDate: new Date().toISOString(),
          truncated: false,
          notModified: true,
          etag: 'W/"abc"',
        }),
        speculative: false,
      })
    );

    const { result } = renderHook(() => useGlobalContext(), { wrapper });
    await flushPromises();

    // A deep link resolves while the disk read is still in flight.
    act(() => {
      result.current.upsertEventInCache(makeEvent('deep-link') as any);
    });

    await act(async () => {
      resolveSnapshot({ events: [makeEvent('p1')], etag: 'W/"abc"' });
    });
    await flushPromises();

    // The cache is now a superset of the snapshot, so the 304 must not treat it
    // as an exact mirror and skip the write — that event would never reach disk.
    expect(mockPersistEvents).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ $id: 'deep-link' })]),
      { etag: 'W/"abc"', coversWindow: true }
    );
  });

  it('keeps the hydrated cache when the retry answers 304', async () => {
    mockClaimEventsFetch.mockReturnValue(
      bootstrap({
        snapshot: Promise.resolve({ events: [makeEvent('p1')], etag: 'W/"abc"' }),
        result: Promise.reject(new Error('Request failed with status code 401')),
        speculative: true,
      })
    );
    mockFetchAllCacheableEvents.mockResolvedValue({
      events: [],
      lookbackDate: new Date().toISOString(),
      truncated: false,
      notModified: true,
      etag: 'W/"abc"',
    });

    const { result } = renderHook(() => useGlobalContext(), { wrapper });
    await flushPromises();

    // The retry carries the snapshot's ETag, and its 304 leaves the cache alone.
    expect(mockFetchAllCacheableEvents).toHaveBeenCalledWith('W/"abc"');
    expect(result.current.eventsCache['p1']).toBeDefined();
  });
});
