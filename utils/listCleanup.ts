/**
 * Pure helpers for retention-based cleanup of saved/liked event entries.
 *
 * Used by SavedEventsProvider and LikedEventsProvider on init to drop entries
 * whose `endsAt` is older than the retention window. Cleanup is purely
 * arithmetic on the stored timestamp, so it works regardless of whether the
 * referenced event is in the global events cache.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Default retention window. Entries with `endsAt < now - RETENTION_DAYS * 1d`
 * are pruned.
 */
export const RETENTION_DAYS = 20;

export interface RetainableEntry {
  endsAt: number;
}

export interface PruneResult<T> {
  kept: T[];
  removedCount: number;
}

export function pruneStaleEntries<T extends RetainableEntry>(
  entries: T[],
  retentionDays: number = RETENTION_DAYS,
  now: number = Date.now()
): PruneResult<T> {
  const cutoff = now - retentionDays * MS_PER_DAY;
  const kept = entries.filter((entry) => entry.endsAt >= cutoff);
  return { kept, removedCount: entries.length - kept.length };
}
