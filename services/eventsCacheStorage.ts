import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event } from '@/types/event.types';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
import { MAX_EVENT_LOOKBACK_MS } from '@/constants/EventConfig';
import { hasEventEnded } from '@/utils/eventStatus';
import { parseAsUTC } from '@/utils/eventFormatters';
import { logger } from '@/utils/logger';

const EVENTS_CACHE_KEY = STORAGE_KEYS.EVENTS_CACHE;

/**
 * Bump when the persisted payload shape (or the Event fields hydration relies
 * on) changes incompatibly. The snapshot survives app updates, so a version
 * mismatch must invalidate it instead of feeding old-shape objects into the
 * render path. Exported for tests.
 */
export const EVENTS_CACHE_SCHEMA_VERSION = 2;

/**
 * Cap on the number of events persisted for cold-start hydration. The in-memory
 * cache still holds the full fetch (up to API_LIMITS.EVENTS_MAX); we persist a
 * bounded slice so the cold-start JSON parse stays cheap. Upcoming events get
 * the budget first — they are what the first paint needs — and already-ended
 * events inside the lookback fill whatever is left. Known tradeoff: until the
 * revalidation fetch lands, days/areas beyond the persisted slice render as
 * empty rather than loading.
 */
const MAX_PERSISTED_EVENTS = 200;

/** Progressively smaller slices to try when the serialized payload is too big. */
const FALLBACK_EVENT_COUNTS = [MAX_PERSISTED_EVENTS, 100, 50] as const;

/**
 * Size guard for the single AsyncStorage value: Android's SQLite-backed store
 * fails reads past the ~2MB CursorWindow row limit, so stay well under it.
 * Measured in UTF-16 code units, which for mostly-ASCII JSON ≈ bytes.
 */
const MAX_PAYLOAD_BYTES = 1_500_000;

/**
 * Skip hydrating a snapshot older than this — beyond it too many events have
 * likely ended or changed to be worth painting before the fresh fetch lands.
 */
const MAX_HYDRATION_AGE_MS = 24 * 60 * 60 * 1000;

interface PersistedEventsCache {
  version: number;
  events: Event[];
  timestamp: number;
  /** ETag of the /events response this snapshot was built from, if any. */
  etag?: string;
}

/** A loaded snapshot: the events to paint, plus the ETag to revalidate with. */
export interface PersistedEventsSnapshot {
  events: Event[];
  etag?: string;
}

/**
 * Minimal per-item shape check so a corrupt or legacy snapshot entry can't
 * reach the render path (a null entry would throw inside the cache updater).
 */
function isPersistableEvent(value: unknown): value is Event {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.$id === 'string' &&
    typeof event.title === 'string' &&
    typeof event.start_time === 'string'
  );
}

/**
 * Load the persisted events snapshot for an instant cold-start paint
 * (stale-while-revalidate). Returns null when nothing is stored, the schema
 * version doesn't match, the snapshot is too old, or the payload is unreadable —
 * callers then fall back to the network fetch. Never throws.
 */
export async function loadPersistedEvents(): Promise<PersistedEventsSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedEventsCache;
    if (!parsed || parsed.version !== EVENTS_CACHE_SCHEMA_VERSION) return null;
    if (typeof parsed.timestamp !== 'number') return null;
    if (Date.now() - parsed.timestamp > MAX_HYDRATION_AGE_MS) return null;
    if (!Array.isArray(parsed.events)) return null;

    const events = parsed.events.filter(isPersistableEvent);
    if (events.length === 0) return null;

    // An ETag is present only when the snapshot it was written with covered the
    // whole fetch window (see persistEvents), so callers can revalidate against
    // it directly: a 304 then confirms exactly what was painted.
    return { events, etag: typeof parsed.etag === 'string' ? parsed.etag : undefined };
  } catch (error) {
    logger.warn('[eventsCacheStorage] Failed to load persisted events', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Persist a slice of the events cache for the next cold start.
 *
 * The slice covers the same window the cold-start fetch asks for — events
 * starting no earlier than MAX_EVENT_LOOKBACK_MS ago — ordered upcoming-first
 * (soonest first) and then already-ended ones (most recent first) as filler, so
 * the cap can never starve the events the first paint is actually for. If the
 * serialized payload exceeds MAX_PAYLOAD_BYTES the cap shrinks stepwise, and an
 * unstorable payload is skipped rather than risk an unreadable row. Never throws.
 *
 * @param options.etag - ETag of the /events response this cache was built from,
 *   letting the next cold start revalidate with If-None-Match instead of
 *   re-downloading an unchanged window. It is stored ONLY when this snapshot
 *   actually covers that window (see options.coversWindow, and nothing dropped
 *   by the cap): a 304 tells the caller "what you have is current", so handing
 *   out an ETag for a partial snapshot would freeze the app on that subset.
 * @param options.coversWindow - Whether the fetch behind this cache saw the
 *   entire server window (i.e. it did not stop at the fetch ceiling). Defaults
 *   to false: without a positive claim, no ETag is stored.
 */
export async function persistEvents(
  events: Event[],
  options?: { etag?: string; coversWindow?: boolean }
): Promise<void> {
  try {
    const now = new Date();
    const windowStartMs = now.getTime() - MAX_EVENT_LOOKBACK_MS;

    // Decorate-sort-undecorate: parse each start_time once, not per comparison.
    const inWindow = events
      .map((event) => ({
        startMs: parseAsUTC(event.start_time).getTime(),
        ended: hasEventEnded(event, now),
        event,
      }))
      .filter(({ startMs }) => startMs >= windowStartMs);

    const upcoming = inWindow.filter((entry) => !entry.ended).sort((a, b) => a.startMs - b.startMs);
    const ended = inWindow.filter((entry) => entry.ended).sort((a, b) => b.startMs - a.startMs);
    const ordered = [...upcoming, ...ended].map(({ event }) => event);

    // Nothing upcoming: keep whatever snapshot exists rather than clobber it
    // with an empty one (the 24h age-out handles genuine staleness).
    if (upcoming.length === 0) return;

    for (const count of FALLBACK_EVENT_COUNTS) {
      const slice = ordered.slice(0, count);
      const complete = options?.coversWindow === true && slice.length === ordered.length;
      const payload: PersistedEventsCache = {
        version: EVENTS_CACHE_SCHEMA_VERSION,
        events: slice,
        timestamp: now.getTime(),
        ...(options?.etag && complete ? { etag: options.etag } : {}),
      };
      const serialized = JSON.stringify(payload);
      if (serialized.length > MAX_PAYLOAD_BYTES) continue;
      await AsyncStorage.setItem(EVENTS_CACHE_KEY, serialized);
      return;
    }

    logger.warn('[eventsCacheStorage] Snapshot too large to persist; skipped', {
      count: ordered.length,
    });
  } catch (error) {
    logger.warn('[eventsCacheStorage] Failed to persist events', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
