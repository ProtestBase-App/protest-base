import { pruneStaleEntries, RETENTION_DAYS } from '../listCleanup';

const DAY = 24 * 60 * 60 * 1000;

describe('pruneStaleEntries', () => {
  const now = 1_700_000_000_000;

  it('returns empty result for empty input', () => {
    const result = pruneStaleEntries([], RETENTION_DAYS, now);
    expect(result.kept).toEqual([]);
    expect(result.removedCount).toBe(0);
  });

  it('keeps all entries within the retention window', () => {
    const entries = [
      { id: 'a', endsAt: now },
      { id: 'b', endsAt: now - 5 * DAY },
      { id: 'c', endsAt: now - 19 * DAY },
    ];
    const result = pruneStaleEntries(entries, RETENTION_DAYS, now);
    expect(result.kept).toEqual(entries);
    expect(result.removedCount).toBe(0);
  });

  it('removes entries older than the retention window', () => {
    const entries = [
      { id: 'fresh', endsAt: now - 1 * DAY },
      { id: 'stale', endsAt: now - 25 * DAY },
    ];
    const result = pruneStaleEntries(entries, RETENTION_DAYS, now);
    expect(result.kept).toEqual([{ id: 'fresh', endsAt: now - 1 * DAY }]);
    expect(result.removedCount).toBe(1);
  });

  it('keeps an entry exactly at the cutoff', () => {
    const cutoffEntry = { id: 'edge', endsAt: now - RETENTION_DAYS * DAY };
    const result = pruneStaleEntries([cutoffEntry], RETENTION_DAYS, now);
    expect(result.kept).toEqual([cutoffEntry]);
    expect(result.removedCount).toBe(0);
  });

  it('removes an entry one ms past the cutoff', () => {
    const stale = { id: 'past', endsAt: now - RETENTION_DAYS * DAY - 1 };
    const result = pruneStaleEntries([stale], RETENTION_DAYS, now);
    expect(result.kept).toEqual([]);
    expect(result.removedCount).toBe(1);
  });

  it('keeps entries with future endsAt', () => {
    const entries = [
      { id: 'soon', endsAt: now + 5 * DAY },
      { id: 'far', endsAt: now + 365 * DAY },
    ];
    const result = pruneStaleEntries(entries, RETENTION_DAYS, now);
    expect(result.kept).toEqual(entries);
  });

  it('preserves input order', () => {
    const entries = [
      { id: 'fresh1', endsAt: now - 2 * DAY },
      { id: 'stale', endsAt: now - 30 * DAY },
      { id: 'fresh2', endsAt: now - 5 * DAY },
    ];
    const result = pruneStaleEntries(entries, RETENTION_DAYS, now);
    expect(result.kept.map((e) => e.id)).toEqual(['fresh1', 'fresh2']);
  });

  it('honors a custom retentionDays', () => {
    const entries = [
      { id: 'a', endsAt: now - 8 * DAY },
      { id: 'b', endsAt: now - 12 * DAY },
    ];
    const result = pruneStaleEntries(entries, 10, now);
    expect(result.kept.map((e) => e.id)).toEqual(['a']);
  });
});
