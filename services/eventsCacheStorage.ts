import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event } from '@/types/event.types';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
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
export const EVENTS_CACHE_SCHEMA_VERSION = 1;

/**
 * Cap on the number of events persisted for cold-start hydration. The in-memory
 * cache still holds the full fetch (up to API_LIMITS.EVENTS_MAX); we persist only
 * the soonest upcoming slice so the cold-start JSON parse stays cheap and the
 * first paint of the calendar/maps shows the most relevant events. Known
 * tradeoff: until the revalidation fetch lands, days/areas beyond the persisted
 * slice render as empty rather than loading.
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
export async function loadPersistedEvents(): Promise<Event[] | null> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedEventsCache;
    if (!parsed || parsed.version !== EVENTS_CACHE_SCHEMA_VERSION) return null;
    if (typeof parsed.timestamp !== 'number') return null;
    if (Date.now() - parsed.timestamp > MAX_HYDRATION_AGE_MS) return null;
    if (!Array.isArray(parsed.events)) return null;

    const events = parsed.events.filter(isPersistableEvent);
    return events.length > 0 ? events : null;
  } catch (error) {
    logger.warn('[eventsCacheStorage] Failed to load persisted events', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Persist the soonest upcoming slice of the events cache for the next cold
 * start. Ended events are dropped and the list is capped to MAX_PERSISTED_EVENTS
 * (soonest first); if the serialized payload still exceeds MAX_PAYLOAD_BYTES the
 * cap shrinks stepwise, and an unstorable payload is skipped rather than risk an
 * unreadable row. Never throws.
 */
export async function persistEvents(events: Event[]): Promise<void> {
  try {
    const now = new Date();
    // Decorate-sort-undecorate: parse each start_time once, not per comparison.
    const upcoming = events
      .filter((event) => !hasEventEnded(event, now))
      .map((event) => ({ startMs: parseAsUTC(event.start_time).getTime(), event }))
      .sort((a, b) => a.startMs - b.startMs)
      .map(({ event }) => event);

    // Nothing upcoming: keep whatever snapshot exists rather than clobber it
    // with an empty one (the 24h age-out handles genuine staleness).
    if (upcoming.length === 0) return;

    for (const count of FALLBACK_EVENT_COUNTS) {
      const payload: PersistedEventsCache = {
        version: EVENTS_CACHE_SCHEMA_VERSION,
        events: upcoming.slice(0, count),
        timestamp: now.getTime(),
      };
      const serialized = JSON.stringify(payload);
      if (serialized.length > MAX_PAYLOAD_BYTES) continue;
      await AsyncStorage.setItem(EVENTS_CACHE_KEY, serialized);
      return;
    }

    logger.warn('[eventsCacheStorage] Snapshot too large to persist; skipped', {
      count: upcoming.length,
    });
  } catch (error) {
    logger.warn('[eventsCacheStorage] Failed to persist events', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
