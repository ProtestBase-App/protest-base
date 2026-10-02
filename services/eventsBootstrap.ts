/**
 * Cold-start events fetch.
 *
 * Owns the single "browse window" request every launch makes, so it can be
 * started before the startup gates resolve and adopted afterwards by
 * GlobalProvider instead of being issued twice. See startEventsPrefetch below
 * for why that matters.
 */

import { getEventsBackend } from '@/services/event.service';
import { apiPrefixReady, hasKnownApiPrefix } from '@/services/api';
import { loadPersistedEvents, PersistedEventsSnapshot } from '@/services/eventsCacheStorage';
import { API_LIMITS } from '@/constants/ApiConfig';
import { MAX_EVENT_LOOKBACK_MS } from '@/constants/EventConfig';
import { Event } from '@/types/event.types';
import { logger } from '@/utils/logger';

/**
 * Timeout for the one-shot cache fetch: it downloads up to EVENTS_MAX events in
 * a single response, so it needs a bigger budget than the axios instance's 10s
 * default, which is sized for small paginated requests.
 */
const CACHE_FETCH_TIMEOUT_MS = 30000;

export interface CacheableEventsFetch {
  events: Event[];
  /** ISO start of the fetched window — entries older than this are outside it. */
  lookbackDate: string;
  /** True when the backend reported more events than the ceiling returned. */
  truncated: boolean;
  /** True when the backend confirmed the window is unchanged (304); no events. */
  notModified: boolean;
  /** ETag to revalidate the next cold start with, when the backend sent one. */
  etag?: string;
}

/**
 * Fetch the full browse window (lookback + all upcoming events) in a single
 * request. The calendar and maps tabs browse ALL events from this cache, so we
 * pull up to the backend's documented ceiling (API_LIMITS.EVENTS_MAX) in one
 * round-trip instead of walking pages — one request keeps cold-start latency to
 * a single hit.
 *
 * @param ifNoneMatch - ETag of the window this device already holds. The
 *   startDate below is a fresh timestamp every launch, so the URL never repeats
 *   and the platform HTTP cache can never help here — revalidation only happens
 *   because we send this header explicitly.
 */
export async function fetchAllCacheableEvents(ifNoneMatch?: string): Promise<CacheableEventsFetch> {
  // Look back to include events that started recently but may still be ongoing.
  // This ensures multi-day events and events without end_time are included.
  const lookbackDate = new Date(Date.now() - MAX_EVENT_LOOKBACK_MS).toISOString();

  // includeEnded: true so the cache can serve saved events whose end_time is in
  // the past but still within the saved-event retention window (kept by
  // SavedEventsProvider).
  const result = await getEventsBackend(
    {
      startDate: lookbackDate,
      limit: API_LIMITS.EVENTS_MAX,
      offset: 0,
      includeEnded: true,
    },
    {
      timeout: CACHE_FETCH_TIMEOUT_MS,
      // The window is public data, and this request can be in flight before
      // GlobalProvider has registered the token-expiration handler. Sending it
      // without the JWT keeps it out of the 401/refresh path, where a dead
      // refresh token would clear the session with nobody listening — a silent
      // sign-out plus a never-settling promise that strands the launch fetch.
      skipAuth: true,
      ...(ifNoneMatch ? { ifNoneMatch } : {}),
    }
  );

  if (result.notModified) {
    return { events: [], lookbackDate, truncated: false, notModified: true, etag: result.etag };
  }

  const truncated = result.total > result.events.length;
  if (truncated) {
    logger.warn('[EventsBootstrap] Events cache truncated at fetch ceiling', {
      fetched: result.events.length,
      total: result.total,
    });
  }

  return {
    events: result.events,
    lookbackDate,
    truncated,
    notModified: false,
    etag: result.etag,
  };
}

/** One launch's events fetch, together with the snapshot it revalidates against. */
export interface EventsFetch {
  /**
   * The persisted snapshot, read before the request goes out because it carries
   * the ETag the request revalidates with. Never rejects.
   */
  snapshot: Promise<PersistedEventsSnapshot | null>;
  result: Promise<CacheableEventsFetch>;
  /** True when this started before the version gate resolved. */
  speculative: boolean;
}

let pending: EventsFetch | null = null;
let claimed = false;

function createEventsFetch(speculative: boolean): EventsFetch {
  const snapshot = loadPersistedEvents();
  const result = snapshot.then((persisted) => fetchAllCacheableEvents(persisted?.etag));
  // A prefetch can settle seconds before GlobalProvider mounts to await it, so
  // absorb early rejections here to keep them from surfacing as unhandled. The
  // real await still observes the rejection.
  result.catch(() => {});
  return { snapshot, result, speculative };
}

/**
 * Start the events fetch without waiting for the startup gates.
 *
 * VersionGate renders a spinner *instead of* its children while /app/config is
 * in flight, so GlobalProvider — and with it the events fetch — does not mount
 * until the version check has completed. The events window is anonymous and
 * doesn't depend on that result, so it can travel alongside it; GlobalProvider
 * adopts it via claimEventsFetch().
 *
 * Strictly best-effort: it never throws, and it declines to run until the API
 * prefix is known. Await `apiPrefixReady` before calling.
 */
export function startEventsPrefetch(): void {
  // Already started, or GlobalProvider got there first — starting now would add
  // a second request rather than remove a wait.
  if (pending || claimed) return;

  if (!hasKnownApiPrefix()) {
    logger.debug('[EventsBootstrap] API prefix not known yet; leaving the fetch to GlobalProvider');
    return;
  }

  logger.debug('[EventsBootstrap] Prefetching the events window ahead of the startup gates');
  pending = createEventsFetch(true);
}

/**
 * Take over the launch fetch: returns the prefetched one when it exists (so a
 * launch makes exactly one /events request), otherwise starts a fresh one.
 * Every call after the first starts a fresh fetch, which is what retries need.
 */
export function claimEventsFetch(): EventsFetch {
  claimed = true;
  const fetch = pending ?? createEventsFetch(false);
  pending = null;
  return fetch;
}
