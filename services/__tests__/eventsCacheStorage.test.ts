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
    expect(loaded!.map((e) => e.$id).sort()).toEqual(['e1', 'e2']);
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadPersistedEvents()).toBeNull();
  });

  it('drops ended events before persisting', async () => {
    const ended = makeEvent('ended', -2 * DAY_MS, -1 * DAY_MS);
    const upcoming = makeEvent('upcoming', DAY_MS);

    await persistEvents([ended, upcoming]);
    const loaded = await loadPersistedEvents();

    expect(loaded!.map((e) => e.$id)).toEqual(['upcoming']);
  });

  it('caps the snapshot to 200 events, soonest first', async () => {
    // 250 future events in reverse order so persist must sort them.
    const events = Array.from({ length: 250 }, (_, i) =>
      makeEvent(`evt-${String(250 - i).padStart(3, '0')}`, (250 - i) * HOUR_MS)
    );

    await persistEvents(events);
    const loaded = await loadPersistedEvents();

    expect(loaded!.length).toBe(200);
    // Soonest kept is +1h; the far-future tail (201h..250h) is dropped.
    expect(loaded![0].$id).toBe('evt-001');
    expect(loaded!.some((e) => e.$id === 'evt-250')).toBe(false);
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

    expect(loaded!.map((e) => e.$id)).toEqual(['valid']);
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
    expect(loaded!.length).toBe(100);
    expect(loaded![0].$id).toBe('evt-001');
  });

  it('does not clobber an existing snapshot when nothing upcoming is passed', async () => {
    await persistEvents([makeEvent('keep-me', DAY_MS)]);

    // Everything ended → persist must be a no-op, not an empty overwrite.
    await persistEvents([makeEvent('ended', -2 * DAY_MS, -1 * DAY_MS)]);

    const loaded = await loadPersistedEvents();
    expect(loaded!.map((e) => e.$id)).toEqual(['keep-me']);
  });

  it('swallows write errors and never throws', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(persistEvents([makeEvent('e', DAY_MS)])).resolves.toBeUndefined();
  });
});
