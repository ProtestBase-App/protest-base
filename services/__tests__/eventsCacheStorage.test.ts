import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
import { Event } from '@/types/event.types';
import {
  EVENTS_CACHE_SCHEMA_VERSION,
  loadPersistedEvents,
  persistEvents,
} from '../eventsCacheStorage';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function makeEvent(id: string, startOffsetMs: number, endOffsetMs?: number): Event {
  return {
    $id: id,
    id,
    title: id,
    description: '',
    organizer_name: 'Org',
    country: 'BE',
    start_time: new Date(Date.now() + startOffsetMs).toISOString(),
    ...(endOffsetMs !== undefined
      ? { end_time: new Date(Date.now() + endOffsetMs).toISOString() }
      : {}),
  } as Event;
}

// The official async-storage mock is stateful and in-memory. We reset the store
// (not the jest.fns — clearAllMocks would wipe the mock's own implementations).
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('eventsCacheStorage', () => {
  it('round-trips upcoming events through persist -> load', async () => {
    const events = [makeEvent('e1', DAY_MS), makeEvent('e2', 2 * DAY_MS)];

    await persistEvents(events);
    const loaded = await loadPersistedEvents();

    expect(loaded).not.toBeNull();
    expect(loaded!.events.map((e) => e.$id).sort()).toEqual(['e1', 'e2']);
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadPersistedEvents()).toBeNull();
  });

  it('round-trips the ETag alongside the events', async () => {
    await persistEvents([makeEvent('e1', DAY_MS)], { etag: 'W/"abc123"', coversWindow: true });

    const loaded = await loadPersistedEvents();

    expect(loaded!.etag).toBe('W/"abc123"');
  });

  it('withholds the ETag when the fetch behind the cache was truncated', async () => {
    // A 304 would pin the app to this subset, so the snapshot must not offer a
    // validator it cannot stand behind.
    await persistEvents([makeEvent('e1', DAY_MS)], { etag: 'W/"abc123"', coversWindow: false });

    expect((await loadPersistedEvents())!.etag).toBeUndefined();
  });

  it('withholds the ETag when the cap dropped part of the window', async () => {
    const events = Array.from({ length: 250 }, (_, i) => makeEvent(`evt-${i}`, (i + 1) * HOUR_MS));

    await persistEvents(events, { etag: 'W/"abc123"', coversWindow: true });

    const loaded = await loadPersistedEvents();
    expect(loaded!.events).toHaveLength(200);
    expect(loaded!.etag).toBeUndefined();
  });

  it('requires a positive coversWindow claim before storing an ETag', async () => {
    await persistEvents([makeEvent('e1', DAY_MS)], { etag: 'W/"abc123"' });

    expect((await loadPersistedEvents())!.etag).toBeUndefined();
  });

  it('keeps ended events inside the lookback so the snapshot matches the window', async () => {
    const endedRecently = makeEvent('ended-recent', -2 * DAY_MS, -1 * DAY_MS);
    const endedLongAgo = makeEvent('ended-old', -25 * DAY_MS, -24 * DAY_MS);
    const upcoming = makeEvent('upcoming', DAY_MS);

    await persistEvents([endedLongAgo, endedRecently, upcoming], { coversWindow: true });

    const loaded = await loadPersistedEvents();
    // Upcoming first (that's what the first paint needs), then in-window ended
    // events as filler. Anything before the 20-day lookback is outside the
    // window the cold-start fetch asks for, so it is not part of the snapshot.
    expect(loaded!.events.map((e) => e.$id)).toEqual(['upcoming', 'ended-recent']);
  });

  it('never lets ended filler crowd out upcoming events at the cap', async () => {
    const ended = Array.from({ length: 250 }, (_, i) =>
      makeEvent(`ended-${i}`, -(i + 2) * HOUR_MS, -(i + 1) * HOUR_MS)
    );
    const upcoming = Array.from({ length: 10 }, (_, i) => makeEvent(`up-${i}`, (i + 1) * HOUR_MS));

    await persistEvents([...ended, ...upcoming], { coversWindow: true });

    const loaded = await loadPersistedEvents();
    expect(loaded!.events.slice(0, 10).map((e) => e.$id)).toEqual(upcoming.map((e) => e.$id));
  });

  it('loads without an ETag when none was persisted', async () => {
    await persistEvents([makeEvent('e1', DAY_MS)]);

    const loaded = await loadPersistedEvents();

    expect(loaded!.events).toHaveLength(1);
    expect(loaded!.etag).toBeUndefined();
  });

  it('ignores a non-string ETag rather than revalidating with garbage', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.EVENTS_CACHE,
      JSON.stringify({
        version: EVENTS_CACHE_SCHEMA_VERSION,
        events: [makeEvent('e1', DAY_MS)],
        timestamp: Date.now(),
        etag: 42,
      })
    );

    expect((await loadPersistedEvents())!.etag).toBeUndefined();
  });

  it('returns null for a snapshot written by the previous schema version', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.EVENTS_CACHE,
      JSON.stringify({
        version: EVENTS_CACHE_SCHEMA_VERSION - 1,
        events: [makeEvent('old-schema', DAY_MS)],
        timestamp: Date.now(),
      })
    );

    expect(await loadPersistedEvents()).toBeNull();
  });

  it('drops events that start before the fetch window', async () => {
    // Deep-linked past events live in the in-memory cache but are outside the
    // window the cold-start fetch asks for, so they are not part of the snapshot.
    const outsideWindow = makeEvent('old', -25 * DAY_MS, -24 * DAY_MS);
    const upcoming = makeEvent('upcoming', DAY_MS);

    await persistEvents([outsideWindow, upcoming]);
    const loaded = await loadPersistedEvents();

    expect(loaded!.events.map((e) => e.$id)).toEqual(['upcoming']);
  });

  it('caps the snapshot to 200 events, soonest first', async () => {
    // 250 future events in reverse order so persist must sort them.
    const events = Array.from({ length: 250 }, (_, i) =>
      makeEvent(`evt-${String(250 - i).padStart(3, '0')}`, (250 - i) * HOUR_MS)
    );

    await persistEvents(events);
    const loaded = await loadPersistedEvents();

    expect(loaded!.events.length).toBe(200);
    // Soonest kept is +1h; the far-future tail (201h..250h) is dropped.
    expect(loaded!.events[0].$id).toBe('evt-001');
    expect(loaded!.events.some((e) => e.$id === 'evt-250')).toBe(false);
  });

  it('returns null for a snapshot older than the hydration window', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.EVENTS_CACHE,
      JSON.stringify({
        version: EVENTS_CACHE_SCHEMA_VERSION,
        events: [makeEvent('stale', DAY_MS)],
        timestamp: Date.now() - 25 * HOUR_MS,
      })
    );

    expect(await loadPersistedEvents()).toBeNull();
  });

  it('returns null for a snapshot with a different schema version', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.EVENTS_CACHE,
      JSON.stringify({
        version: EVENTS_CACHE_SCHEMA_VERSION + 1,
        events: [makeEvent('future-schema', DAY_MS)],
        timestamp: Date.now(),
      })
    );

    expect(await loadPersistedEvents()).toBeNull();
  });

  it('filters malformed entries out of a parseable snapshot', async () => {
    const valid = makeEvent('valid', DAY_MS);
    await AsyncStorage.setItem(
      STORAGE_KEYS.EVENTS_CACHE,
      JSON.stringify({
        version: EVENTS_CACHE_SCHEMA_VERSION,
        events: [null, {}, { $id: 42 }, { $id: 'no-start', title: 'x' }, valid],
        timestamp: Date.now(),
      })
    );

    const loaded = await loadPersistedEvents();

    expect(loaded!.events.map((e) => e.$id)).toEqual(['valid']);
  });

  it('returns null for an unreadable payload', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.EVENTS_CACHE, 'not-json{');

    expect(await loadPersistedEvents()).toBeNull();
  });

  it('shrinks the persisted slice when the payload would exceed the byte cap', async () => {
    // ~12KB per event: 200 × 12KB ≈ 2.4MB (over the cap) but 100 × 12KB ≈ 1.2MB fits.
    const bigDescription = 'x'.repeat(12_000);
    const events = Array.from({ length: 250 }, (_, i) => ({
      ...makeEvent(`evt-${String(i + 1).padStart(3, '0')}`, (i + 1) * HOUR_MS),
      description: bigDescription,
    }));

    await persistEvents(events);
    const loaded = await loadPersistedEvents();

    expect(loaded).not.toBeNull();
    expect(loaded!.events.length).toBe(100);
    expect(loaded!.events[0].$id).toBe('evt-001');
  });

  it('does not clobber an existing snapshot when nothing upcoming is passed', async () => {
    await persistEvents([makeEvent('keep-me', DAY_MS)]);

    // Everything ended → persist must be a no-op, not an empty overwrite.
    await persistEvents([makeEvent('ended', -2 * DAY_MS, -1 * DAY_MS)]);

    const loaded = await loadPersistedEvents();
    expect(loaded!.events.map((e) => e.$id)).toEqual(['keep-me']);
  });

  it('swallows write errors and never throws', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(persistEvents([makeEvent('e', DAY_MS)])).resolves.toBeUndefined();
  });
});
