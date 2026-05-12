import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { useGlobalContext } from './GlobalProvider';
import {
  fetchLikedEntriesLocally,
  writeLikedEntriesLocally,
  addLikedEntryLocally,
  removeLikedIdLocally,
  LikedEntry,
} from '@/services/localStorageService';
import { likeEventOnServer, unlikeEventOnServer } from '@/services/engagement.service';
import { logger } from '@/utils/logger';
import { Event } from '@/types/event.types';
import { getEffectiveEndTime } from '@/utils/eventStatus';
import { pruneStaleEntries, RETENTION_DAYS } from '@/utils/listCleanup';

const ENDS_AT_FALLBACK_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Tracks which events the user has liked. Liked state is device-local only and
 * encrypted at rest via expo-secure-store. The aggregate `like_count` is
 * returned by the server and is authoritative.
 *
 * Callers with full event data (event detail screen, deep links) SHOULD pass
 * `endsAt` to `likeEvent` so cleanup uses the real end time rather than a
 * 1-year fallback.
 */
interface LikedEventsContextType {
  likedEventIds: string[];
  /** Returns the new server like_count so the caller can update `event.like_count`. */
  likeEvent: (eventId: string, endsAt?: number) => Promise<number | null>;
  unlikeEvent: (eventId: string) => Promise<number | null>;
  isLiked: (eventId: string) => boolean;
  loading: boolean;
}

const LikedEventsContext = createContext<LikedEventsContextType | undefined>(undefined);

export function LikedEventsProvider({ children }: { children: ReactNode }) {
  const { eventsCache } = useGlobalContext();
  const [likedEventIds, setLikedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const entries = await fetchLikedEntriesLocally();
        const { kept, removedCount } = pruneStaleEntries(entries, RETENTION_DAYS);
        if (removedCount > 0) {
          try {
            await writeLikedEntriesLocally(kept);
          } catch (writeError) {
            logger.warn('[LikedEvents] Failed to persist pruned entries', {
              error: writeError instanceof Error ? writeError.message : String(writeError),
            });
          }
        }
        if (isMounted) setLikedEventIds(kept.map((e) => e.id));
      } catch (error) {
        logger.warn('[LikedEvents] Failed to load', {
          error: error instanceof Error ? error.message : String(error),
        });
        if (isMounted) setLikedEventIds([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const likeEvent = useCallback(
    async (eventId: string, endsAtArg?: number): Promise<number | null> => {
      const cachedEvent = eventsCache[eventId] as Event | undefined;
      const resolvedEndsAt =
        endsAtArg ??
        (cachedEvent
          ? getEffectiveEndTime(cachedEvent).getTime()
          : Date.now() + ENDS_AT_FALLBACK_MS);

      const previous = likedEventIds;
      if (!previous.includes(eventId)) {
        setLikedEventIds([...previous, eventId]);
        try {
          await addLikedEntryLocally({ id: eventId, endsAt: resolvedEndsAt });
        } catch (error) {
          logger.warn('[LikedEvents] Failed to persist', {
            error: error instanceof Error ? error.message : String(error),
          });
          setLikedEventIds(previous);
        }
      }
      try {
        return await likeEventOnServer(eventId);
      } catch (error) {
        logger.warn('[LikedEvents] like failed, rolling back', {
          eventId,
          error: error instanceof Error ? error.message : String(error),
        });
        setLikedEventIds(previous);
        try {
          await removeLikedIdLocally(eventId);
        } catch (rollbackError) {
          logger.warn('[LikedEvents] rollback persist failed', {
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          });
        }
        return null;
      }
    },
    [likedEventIds, eventsCache]
  );

  const unlikeEvent = useCallback(
    async (eventId: string): Promise<number | null> => {
      const previous = likedEventIds;
      setLikedEventIds(previous.filter((id) => id !== eventId));
      try {
        await removeLikedIdLocally(eventId);
      } catch (error) {
        logger.warn('[LikedEvents] Failed to persist unlike', {
          error: error instanceof Error ? error.message : String(error),
        });
        setLikedEventIds(previous);
      }
      try {
        return await unlikeEventOnServer(eventId);
      } catch (error) {
        logger.warn('[LikedEvents] unlike failed, rolling back', {
          eventId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Restore to whatever the storage actually has
        const current = await fetchLikedEntriesLocally();
        setLikedEventIds(current.map((e: LikedEntry) => e.id));
        return null;
      }
    },
    [likedEventIds]
  );

  const isLiked = useCallback(
    (eventId: string): boolean => likedEventIds.includes(eventId),
    [likedEventIds]
  );

  const value = useMemo<LikedEventsContextType>(
    () => ({ likedEventIds, likeEvent, unlikeEvent, isLiked, loading }),
    [likedEventIds, likeEvent, unlikeEvent, isLiked, loading]
  );

  return <LikedEventsContext.Provider value={value}>{children}</LikedEventsContext.Provider>;
}

export function useLikedEvents(): LikedEventsContextType {
  const context = useContext(LikedEventsContext);
  if (!context) {
    throw new Error('useLikedEvents must be used within a LikedEventsProvider');
  }
  return context;
}
