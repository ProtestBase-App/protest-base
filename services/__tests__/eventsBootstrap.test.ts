// Mock dependencies before imports
const mockGetEventsBackend = jest.fn();
const mockLoadPersistedEvents = jest.fn();
const mockHasKnownApiPrefix = jest.fn();

jest.mock('@/services/event.service', () => ({
  getEventsBackend: (...args: any[]) => mockGetEventsBackend(...args),
}));

jest.mock('@/services/eventsCacheStorage', () => ({
  loadPersistedEvents: (...args: any[]) => mockLoadPersistedEvents(...args),
}));

jest.mock('@/services/api', () => ({
  apiPrefixReady: Promise.resolve(),
  hasKnownApiPrefix: () => mockHasKnownApiPrefix(),
}));

const mockGetInstallToken = jest.fn();
const mockIsBypassMode = jest.fn();
const mockIsFallbackMode = jest.fn();
jest.mock('@/services/integrity.service', () => ({
  getInstallToken: () => mockGetInstallToken(),
  isBypassMode: () => mockIsBypassMode(),
  isFallbackMode: () => mockIsFallbackMode(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { API_LIMITS } from '@/constants/ApiConfig';
import type * as EventsBootstrap from '../eventsBootstrap';

/**
 * Fresh module registry per test: startEventsPrefetch/claimEventsFetch
 * coordinate through module-level state, so leaking it between tests would make
 * "exactly one request per launch" untestable.
 */
function loadModule(): typeof EventsBootstrap {
  let mod!: typeof EventsBootstrap;
  jest.isolateModules(() => {
    mod = require('../eventsBootstrap');
  });
  return mod;
}

const event = { $id: 'e1', title: 'E', start_time: '2026-08-10T10:00:00Z' };

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadPersistedEvents.mockResolvedValue(null);
  mockGetEventsBackend.mockResolvedValue({ events: [event], total: 1, limit: 500, offset: 0 });
  mockHasKnownApiPrefix.mockReturnValue(true);
  mockGetInstallToken.mockResolvedValue('install-token');
  mockIsBypassMode.mockReturnValue(false);
  mockIsFallbackMode.mockReturnValue(false);
});

describe('eventsBootstrap', () => {
  describe('claiming the launch fetch', () => {
    it('hands the prefetched request to the claimer instead of issuing a second', async () => {
      const mod = loadModule();

      mod.startEventsPrefetch();
      const claimed = mod.claimEventsFetch();

      expect(claimed.speculative).toBe(true);
      await claimed.result;
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(1);
    });

    it('starts its own fetch when nothing was prefetched', async () => {
      const mod = loadModule();

      const claimed = mod.claimEventsFetch();

      expect(claimed.speculative).toBe(false);
      await claimed.result;
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(1);
    });

    it('ignores a second prefetch instead of doubling the request', async () => {
      const mod = loadModule();

      mod.startEventsPrefetch();
      mod.startEventsPrefetch();

      await mod.claimEventsFetch().result;
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(1);
    });

    it('ignores a prefetch that loses the race to the claimer', async () => {
      const mod = loadModule();

      const claimed = mod.claimEventsFetch();
      // Late arrival: without the claimed guard this would orphan a request
      // nobody ever awaits.
      mod.startEventsPrefetch();

      await claimed.result;
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(1);
    });

    it('gives a later claim a fresh fetch, so retries actually retry', async () => {
      const mod = loadModule();

      mod.startEventsPrefetch();
      await mod.claimEventsFetch().result;
      await mod.claimEventsFetch().result;

      expect(mockGetEventsBackend).toHaveBeenCalledTimes(2);
    });

    it('propagates a prefetch failure to the claimer', async () => {
      mockGetEventsBackend.mockRejectedValue(new Error('INSTALL_TOKEN_MISSING'));
      const mod = loadModule();

      mod.startEventsPrefetch();

      await expect(mod.claimEventsFetch().result).rejects.toThrow('INSTALL_TOKEN_MISSING');
    });
  });

  describe('isEventsPrefetchSafe', () => {
    it('is safe once an install token is in hand', async () => {
      await expect(loadModule().isEventsPrefetchSafe()).resolves.toBe(true);
    });

    it('is safe in dev-bypass and fallback modes, which need no install token', async () => {
      mockIsBypassMode.mockReturnValue(true);
      await expect(loadModule().isEventsPrefetchSafe()).resolves.toBe(true);

      mockIsBypassMode.mockReturnValue(false);
      mockIsFallbackMode.mockReturnValue(true);
      await expect(loadModule().isEventsPrefetchSafe()).resolves.toBe(true);

      expect(mockGetInstallToken).not.toHaveBeenCalled();
    });

    it('is NOT safe when attestation fails', async () => {
      // A token-less request would 401 INSTALL_TOKEN_MISSING after the gate has
      // entered fallback, which the interceptor turns into the "please update"
      // off-ramp — on a device whose x-api-key fallback works fine.
      mockGetInstallToken.mockRejectedValue(new Error('attestation failed'));

      await expect(loadModule().isEventsPrefetchSafe()).resolves.toBe(false);
    });
  });

  describe('prefetch guard', () => {
    it('declines to prefetch before the API prefix is known', async () => {
      mockHasKnownApiPrefix.mockReturnValue(false);
      const mod = loadModule();

      mod.startEventsPrefetch();
      await Promise.resolve();

      // No request on the wrong path — the claim below does the real work.
      expect(mockGetEventsBackend).not.toHaveBeenCalled();

      const claimed = mod.claimEventsFetch();
      expect(claimed.speculative).toBe(false);
      await claimed.result;
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchAllCacheableEvents', () => {
    it('requests the whole browse window in one call', async () => {
      const mod = loadModule();

      await mod.fetchAllCacheableEvents();

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: API_LIMITS.EVENTS_MAX,
          offset: 0,
          includeEnded: true,
        }),
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('sends the window request without the user JWT', async () => {
      const mod = loadModule();

      await mod.fetchAllCacheableEvents();

      // Public data, and it can fly before GlobalProvider registers the
      // token-expiration handler — a 401 there would sign the user out silently
      // and strand the promise.
      expect(mockGetEventsBackend.mock.calls[0][1]).toEqual(
        expect.objectContaining({ skipAuth: true })
      );
    });

    it('revalidates with the ETag the snapshot carries', async () => {
      mockLoadPersistedEvents.mockResolvedValue({ events: [event], etag: 'W/"abc"' });
      const mod = loadModule();

      await mod.claimEventsFetch().result;

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ifNoneMatch: 'W/"abc"' })
      );
    });

    it('omits If-None-Match when the snapshot has no ETag', async () => {
      mockLoadPersistedEvents.mockResolvedValue({ events: [event] });
      const mod = loadModule();

      await mod.claimEventsFetch().result;

      expect(mockGetEventsBackend.mock.calls[0][1]).not.toHaveProperty('ifNoneMatch');
    });

    it('surfaces a 304 as notModified with no events', async () => {
      mockGetEventsBackend.mockResolvedValue({
        events: [],
        total: 0,
        limit: 500,
        offset: 0,
        notModified: true,
        etag: 'W/"abc"',
      });
      const mod = loadModule();

      const result = await mod.fetchAllCacheableEvents('W/"abc"');

      expect(result.notModified).toBe(true);
      expect(result.events).toEqual([]);
      expect(result.etag).toBe('W/"abc"');
      expect(result.truncated).toBe(false);
    });

    it('flags a window truncated at the fetch ceiling', async () => {
      mockGetEventsBackend.mockResolvedValue({
        events: [event],
        total: 900,
        limit: 500,
        offset: 0,
      });
      const mod = loadModule();

      const result = await mod.fetchAllCacheableEvents();

      expect(result.truncated).toBe(true);
      expect(result.notModified).toBe(false);
    });
  });
});
