/**
 * SavedEventsProvider
 *
 * Tracks the user's saved events. Storage is encrypted via expo-secure-store
 * and entries carry an `endsAt` timestamp for retention-based cleanup.
 *
 * Callers that have full event data (event detail screen, deep links) SHOULD
 * pass `endsAt` to `saveEvent` so the entry doesn't fall back to a generic
 * 1-year retention. Explore-feed callers can omit it: the provider looks up
 * `eventsCache` to derive `endsAt` from the cached event.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { useGlobalContext } from './GlobalProvider';
import {
  fetchSavedEntriesLocally,
  writeSavedEntriesLocally,
  addSavedEntryLocally,
  removeSavedIdLocally,
  SavedEntry,
} from '@/services/localStorageService';
import { Event, EventNotFoundError, getEventByIdBackend } from '@/services/event.service';
import { saveEventOnServer, unsaveEventOnServer } from '@/services/engagement.service';
import {
  requestNotificationPermissionsOnFirstSave,
  requestSavedDayReconcile,
} from '@/services/notifications.service';
import { logger } from '@/utils/logger';
import { getEffectiveEndTime } from '@/utils/eventStatus';
import { pruneStaleEntries, RETENTION_DAYS } from '@/utils/listCleanup';

const ENDS_AT_FALLBACK_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Tolerant 404 detection. Uses a duck-type check on the error code so it still
 * matches when test mocks substitute a stand-in class that isn't reference-equal
 * to the real `EventNotFoundError` (the mock factory and the source-of-truth
 * class can disagree under jest's hoisting rules).
 */
function isEventNotFoundError(err: unknown): boolean {
  if (typeof EventNotFoundError === 'function' && err instanceof EventNotFoundError) {
    return true;
  }
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'EVENT_NOT_FOUND'
  );
}

interface SavedEventsContextType {
  savedEventIds: string[];
  /**
   * Save an event locally and bump the server save_count.
   * @param eventId - the event identifier
   * @param endsAt - optional event end time (ms). Strongly preferred when the caller
   *   has full event data (e.g. event detail page on a deep link). Without it, the
   *   provider falls back to `eventsCache`, then to a 1-year retention default.
   * @returns the new server save_count if reachable, else null.
   */
  saveEvent: (eventId: string, endsAt?: number) => Promise<number | null>;
  unsaveEvent: (eventId: string) => Promise<number | null>;
  isSaved: (eventId: string) => boolean;
  loading: boolean;
}

const SavedEventsContext = createContext<SavedEventsContextType | undefined>(undefined);

export function SavedEventsProvider({ children }: { children: ReactNode }) {
  const { eventsCache, eventsLoading, upsertEventInCache, userLanguage, isLogged } =
    useGlobalContext();
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Tracks IDs currently being hydrated so the effect doesn't fire duplicate
  // requests across re-renders.
  const inFlightHydrationRef = useRef<Set<string>>(new Set());
  // Tracks IDs whose backend lookup returned 404 so we don't re-attempt them
  // until the user takes action (the saved entry is also removed below, so
  // this is mostly belt-and-braces against a state-update race).
  const knownMissingRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load entries, prune by retention window, persist if changed.
  // Cleanup is pure arithmetic on stored `endsAt`, so we don't wait on
  // eventsLoading.
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        const entries = await fetchSavedEntriesLocally();
        const { kept, removedCount } = pruneStaleEntries(entries, RETENTION_DAYS);
        if (removedCount > 0) {
          try {
            await writeSavedEntriesLocally(kept);
          } catch (writeError) {
            logger.warn('[SavedEvents] Failed to persist pruned entries', {
              error: writeError instanceof Error ? writeError.message : String(writeError),
            });
          }
        }
        if (isMounted) {
          setSavedEventIds(kept.map((e) => e.id));
        }
      } catch (error) {
        logger.error('Failed to initialize saved events:', { error });
        if (isMounted) {
          setSavedEventIds([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  // Hydration: when a saved event isn't in the global cache (saved on a previous
  // session, saved past the cache's pagination window, etc.), fetch it
  // individually so the home calendar can display it. Convergence: each fetch
  // resolves and `upsertEventInCache` updates `eventsCache`, which re-runs this
  // effect; the freshly hydrated ID is now present and is skipped.
  useEffect(() => {
    // Wait for the initial cache load to settle so we don't waste round-trips
    // on IDs the bulk fetch is about to fill in.
    if (eventsLoading) return;
    if (savedEventIds.length === 0) return;

    const missingIds = savedEventIds.filter(
      (id) =>
        !eventsCache[id] &&
        !inFlightHydrationRef.current.has(id) &&
        !knownMissingRef.current.has(id)
    );

    if (missingIds.length === 0) return;

    for (const id of missingIds) {
      inFlightHydrationRef.current.add(id);
      // Fire each fetch independently; one slow event shouldn't block the rest.
      getEventByIdBackend(id)
        .then((event) => {
          if (!isMountedRef.current) return;
          upsertEventInCache(event);
        })
        .catch(async (error: unknown) => {
          if (isEventNotFoundError(error)) {
            // Backend no longer has this event (deleted). Drop the dangling
            // saved entry locally; the server save_count is already irrelevant.
            knownMissingRef.current.add(id);
            try {
              await removeSavedIdLocally(id);
            } catch (removeError) {
              logger.warn('[SavedEvents] failed to drop missing saved entry', {
                eventId: id,
                error: removeError instanceof Error ? removeError.message : String(removeError),
              });
            }
            if (!isMountedRef.current) return;
            setSavedEventIds((prev) => prev.filter((existing) => existing !== id));
          } else {
            logger.warn('[SavedEvents] hydration fetch failed', {
              eventId: id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
        .finally(() => {
          inFlightHydrationRef.current.delete(id);
        });
    }
  }, [savedEventIds, eventsCache, eventsLoading, upsertEventInCache]);

  // On logout / account deletion the in-memory saved set would otherwise stay
  // populated (this provider never remounts), and a later cache refresh would
  // re-schedule the previous user's reminders. clearAuthState wipes storage
  // BEFORE flipping isLogged, so re-reading here yields the post-wipe truth.
  // Guests (never logged in) see no true→false transition and are unaffected.
  const wasLoggedRef = useRef(false);
  useEffect(() => {
    const wasLogged = wasLoggedRef.current;
    wasLoggedRef.current = isLogged;
    if (!wasLogged || isLogged) return;
    fetchSavedEntriesLocally()
      .then((entries) => {
        if (!isMountedRef.current) return;
        setSavedEventIds(entries.map((e) => e.id));
      })
      .catch((error) => {
        logger.warn('[SavedEvents] post-logout reload failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }, [isLogged]);

  // Keep the OS-scheduled day-of reminders in sync with the saved set. Keyed
  // on state rather than called imperatively from saveEvent/unsaveEvent so
  // the rollback paths and the hydration 404-removal reconcile automatically.
  // Also runs once on launch (when both loading flags settle) and after a
  // device-language change.
  useEffect(() => {
    if (loading || eventsLoading) return;
    requestSavedDayReconcile({ savedEventIds, eventsCache, language: userLanguage });
  }, [savedEventIds, eventsCache, eventsLoading, loading, userLanguage]);

  // The local bookmark is the authoritative "is this saved?" state and works
  // offline regardless of the network call.
  const saveEvent = useCallback(
    async (eventId: string, endsAtArg?: number): Promise<number | null> => {
      const cachedEvent = eventsCache[eventId] as Event | undefined;
      const resolvedEndsAt =
        endsAtArg ??
        (cachedEvent
          ? getEffectiveEndTime(cachedEvent).getTime()
          : Date.now() + ENDS_AT_FALLBACK_MS);

      setSavedEventIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]));
      try {
        await addSavedEntryLocally({ id: eventId, endsAt: resolvedEndsAt });
      } catch (error) {
        logger.error('Failed to persist saved event:', { error });
        // Roll back in-memory state to match what storage actually has.
        const current = await fetchSavedEntriesLocally();
        setSavedEventIds(current.map((e) => e.id));
      }

      // Contextual permission ask on the first save ever. Deliberately not
      // awaited: the OS dialog must not suspend or fail the save flow.
      void requestNotificationPermissionsOnFirstSave();

      try {
        return await saveEventOnServer(eventId);
      } catch (error) {
        logger.warn('[SavedEvents] server save_count bump failed', {
          eventId,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },
    [eventsCache]
  );

  const unsaveEvent = useCallback(async (eventId: string): Promise<number | null> => {
    setSavedEventIds((prev) => prev.filter((id) => id !== eventId));
    try {
      await removeSavedIdLocally(eventId);
    } catch (error) {
      logger.error('Failed to persist unsaved event:', { error });
      const current = await fetchSavedEntriesLocally();
      setSavedEventIds(current.map((e: SavedEntry) => e.id));
    }

    try {
      return await unsaveEventOnServer(eventId);
    } catch (error) {
      logger.warn('[SavedEvents] server save_count decrement failed', {
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }, []);

  const isSaved = useCallback(
    (eventId: string): boolean => savedEventIds.includes(eventId),
    [savedEventIds]
  );

  const contextValue = useMemo(
    () => ({ savedEventIds, saveEvent, unsaveEvent, isSaved, loading }),
    [savedEventIds, saveEvent, unsaveEvent, isSaved, loading]
  );

  return <SavedEventsContext.Provider value={contextValue}>{children}</SavedEventsContext.Provider>;
}

export function useSavedEvents(): SavedEventsContextType {
  const context = useContext(SavedEventsContext);
  if (context === undefined) {
    throw new Error('useSavedEvents must be used within a SavedEventsProvider');
  }
  return context;
}
