import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, getCurrentUserSessions } from '@/services/auth.service';
import { fetchEventCounts, EventCounts } from '@/services/event.service';
import { persistEvents } from '@/services/eventsCacheStorage';
import {
  claimEventsFetch,
  fetchAllCacheableEvents,
  CacheableEventsFetch,
} from '@/services/eventsBootstrap';
import * as SecureStore from 'expo-secure-store';
import { setTokenExpirationCallback } from '@/services/api';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { logger } from '@/utils/logger';
import { User } from '@/types/auth.types';
import { Event } from '@/types/event.types';
import { t } from '@/utils/i18n';
import { SECURE_STORE_KEYS, STORAGE_KEYS } from '@/constants/StorageConfig';
import { isNetworkError } from '@/utils/networkError';
import { clearAllUserData } from '@/services/localStorageService';
import { parseAsUTC } from '@/utils/eventFormatters';

/** Where the current eventsCache contents came from — see cacheSourceRef. */
type EventsCacheSource = 'empty' | 'hydrated' | 'fresh';

/** Key an events array by $id for O(1) cache lookups. */
function toEventsMap(events: Event[]): Record<string, Event> {
  const map: Record<string, Event> = {};
  events.forEach((event) => {
    map[event.$id] = event;
  });
  return map;
}

/**
 * Wholesale-apply a fresh fetch while preserving screen-upserted entries the
 * fetch window cannot see: events older than the lookback (deep links to past
 * events) and — when the fetch hit its ceiling — events starting beyond the last
 * fetched one. Entries inside the window are replaced authoritatively, so
 * backend-deleted events still drop out.
 */
function applyFreshEvents(
  prev: Record<string, Event>,
  fetched: Event[],
  lookbackDate: string,
  truncated: boolean
): Record<string, Event> {
  const next = toEventsMap(fetched);
  const lookbackMs = parseAsUTC(lookbackDate).getTime();
  const horizonMs =
    truncated && fetched.length > 0
      ? Math.max(...fetched.map((event) => parseAsUTC(event.start_time).getTime()))
      : Number.POSITIVE_INFINITY;

  for (const [id, event] of Object.entries(prev)) {
    if (id in next) continue;
    const startMs = parseAsUTC(event.start_time).getTime();
    if (startMs < lookbackMs || startMs > horizonMs) {
      next[id] = event;
    }
  }
  return next;
}

export interface GlobalContextValue {
  isLogged: boolean;
  setIsLogged: (value: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;

  userLanguage: string;

  eventsCache: Record<string, Event>;
  eventsLoading: boolean;
  refetchEvents: () => Promise<void>;
  /**
   * Insert or replace an event in the cache. Used by screens that already have
   * a full Event object (event detail, post-create, hydration of saved-event
   * misses) so the home calendar can display it without a full refetch.
   */
  upsertEventInCache: (event: Event) => void;
  /** Remove an event from the cache by id. Used to clean up dangling references. */
  removeEventFromCache: (eventId: string) => void;

  userEventCounts: EventCounts | null;
  userEventCountsLoading: boolean;
  refreshUserEventCounts: (organizationIds?: string[]) => Promise<void>;

  clearAuthState: () => Promise<void>;

  connectionError: boolean;
  retryConnection: () => Promise<void>;
}

interface GlobalProviderProps {
  children: ReactNode;
}

const GlobalContext = createContext<GlobalContextValue | undefined>(undefined);

const USER_EVENT_COUNTS_KEY = STORAGE_KEYS.USER_EVENT_COUNTS;

export const useGlobalContext = (): GlobalContextValue => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Connection error: backend unreachable at startup
  const [connectionError, setConnectionError] = useState<boolean>(false);

  const [eventsCache, setEventsCache] = useState<Record<string, Event>>({});
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);

  // Provenance of the current eventsCache contents. Hydrated-from-disk data must
  // never be re-persisted (restamping would reset the snapshot's age and let
  // stale data outlive the hydration window) and must never overwrite data from
  // a fresh fetch (retryConnection re-entry).
  const cacheSourceRef = useRef<EventsCacheSource>('empty');

  // True while eventsCache holds exactly what the stored snapshot holds — it was
  // hydrated from disk and nothing fresher has landed on top. A 304 marks the
  // cache authoritative without changing its contents, so without this the
  // mirror effect below would write those same events back and restamp the
  // snapshot, letting a disk copy outlive the hydration window that bounds it.
  const cacheMirrorsSnapshotRef = useRef(false);

  // Whether the fetch behind the current cache saw the entire server window, or
  // stopped at the fetch ceiling. Gates whether the snapshot may carry an ETag:
  // a 304 against a partial snapshot would pin the app to that subset.
  const windowTruncatedRef = useRef(true);

  // ETag of the window the current cache came from. Seeded from the snapshot at
  // hydration (NOT only from a 304 response) so a later screen upsert re-persists
  // the snapshot with its ETag intact — dropping it here would silently disable
  // revalidation on the next launch.
  const etagRef = useRef<string | undefined>(undefined);

  // null means counts have never been loaded (show splash for logged-in users)
  const [userEventCounts, setUserEventCounts] = useState<EventCounts | null>(null);
  const [userEventCountsLoading, setUserEventCountsLoading] = useState<boolean>(false);

  const supportedLanguages = ['en', 'fr', 'nl'];
  const localeCode = getLocales()[0]?.languageCode;
  const userLanguage = localeCode && supportedLanguages.includes(localeCode) ? localeCode : 'en';

  /** Sign out in memory only — no storage is touched. */
  const resetAuthMemoryState = useCallback((): void => {
    setIsLogged(false);
    setUser(null);
    setUserEventCounts(null);
  }, []);

  /**
   * Sign out WITHOUT wiping device-local user data. For launches where no
   * authenticated session ever existed — guests, the overwhelming majority of
   * users — saved/liked/followed lists and their scheduled reminders must
   * survive. Only the auth token keys are removed (hygiene for a half-written
   * login). Real invalidation (logout, account deletion, expired/replaced
   * session) goes through clearAuthState instead.
   */
  const resetAuthState = useCallback(async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);
    } catch (error) {
      logger.error('Failed to clear auth tokens from storage:', { error });
    }
    resetAuthMemoryState();
  }, [resetAuthMemoryState]);

  const clearAuthState = useCallback(async (): Promise<void> => {
    // Wipe storage BEFORE flipping auth state so consumers reacting to
    // isLogged (e.g. SavedEventsProvider's logout reload) observe the
    // post-wipe contents, never the pre-logout data.
    try {
      await clearAllUserData();
    } catch (error) {
      logger.error('Failed to clear user data from storage:', { error });
    }
    await resetAuthState();
  }, [resetAuthState]);

  const refreshUserEventCounts = useCallback(async (organizationIds?: string[]): Promise<void> => {
    // If no organizations, set counts to zero (not null) to exit loading state
    if (!organizationIds || organizationIds.length === 0) {
      const zeroCounts: EventCounts = { upcoming: 0, past: 0, draft: 0 };
      setUserEventCounts(zeroCounts);
      await AsyncStorage.setItem(USER_EVENT_COUNTS_KEY, JSON.stringify(zeroCounts));
      return;
    }

    try {
      setUserEventCountsLoading(true);
      const counts = await fetchEventCounts(organizationIds);
      setUserEventCounts(counts);

      await AsyncStorage.setItem(USER_EVENT_COUNTS_KEY, JSON.stringify(counts));
    } catch (error) {
      logger.error('Failed to refresh user event counts:', { error });
      // Don't clear existing counts on error - keep stale data
    } finally {
      setUserEventCountsLoading(false);
    }
  }, []);

  // Extracted as useCallback so retryConnection can re-invoke it
  const validateUserSession = useCallback(async (): Promise<void> => {
    logger.debug('[GlobalProvider] Validating user session...');
    try {
      // No token / no session id = the user was never authenticated this
      // install (guest) or a login write was interrupted. NEVER clearAuthState
      // here: it would wipe the guest's saved/liked/followed lists and cancel
      // their scheduled reminders on every launch.
      const accessToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      if (!accessToken) {
        logger.debug('[GlobalProvider] No access token — guest session');
        await resetAuthState();
        return;
      }

      const storedSessionId = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SESSION_ID);
      if (!storedSessionId) {
        await resetAuthState();
        return;
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        await clearAuthState();
        return;
      }

      const sessions = await getCurrentUserSessions();
      if (!sessions?.session) {
        await clearAuthState();
        return;
      }

      const isValidSession = sessions.session.some(
        (session) => session.userId === currentUser.$id && session.$id === storedSessionId
      );

      if (isValidSession) {
        setIsLogged(true);
        setUser(currentUser);
        logger.info('[GlobalProvider] User logged in', { userId: currentUser.$id });

        try {
          const cachedCounts = await AsyncStorage.getItem(USER_EVENT_COUNTS_KEY);
          if (cachedCounts) {
            setUserEventCounts(JSON.parse(cachedCounts) as EventCounts);
          }
        } catch (error) {
          logger.error('Failed to load cached event counts:', { error });
        }

        // Event counts are refreshed by UserOrganizationsProvider once the user's
        // organizations are loaded.
      } else {
        await clearAuthState();
      }
    } catch (error) {
      logger.error('[GlobalProvider] Session validation failed', { error });
      if (isNetworkError(error)) {
        setConnectionError(true);
      } else {
        // Unexpected failure (e.g. backend 5xx): possibly transient, so keep
        // local data AND the stored tokens — the next launch revalidates. A
        // genuinely dead session is invalidated by the 401→refresh-failure
        // callback instead, with a user-visible alert.
        resetAuthMemoryState();
      }
    } finally {
      setLoading(false);
    }
  }, [clearAuthState, resetAuthState, resetAuthMemoryState]);

  // Extracted as useCallback so retryConnection can re-invoke it
  const fetchInitialEvents = useCallback(async (): Promise<void> => {
    try {
      setEventsLoading(true);

      // Adopt the fetch started before the startup gates resolved, so the
      // window is already in flight (or in hand) by the time we get here. Falls
      // back to starting one when nothing was prefetched — first-ever launch,
      // or a retryConnection re-entry.
      const bootstrap = claimEventsFetch();

      // Stale-while-revalidate: paint the persisted snapshot instantly, merged
      // UNDER anything screens already upserted (those entries are fresher).
      // The Home/Maps tabs stop showing their splash as soon as the cache is
      // non-empty, so a cold start renders cached events without a network
      // wait. Skipped once a fresh fetch has landed this session
      // (retryConnection re-entry) so stale entries can't resurface.
      //
      // The snapshot is read BEFORE the request goes out (see eventsBootstrap)
      // because it carries the ETag we revalidate with: paying one disk read up
      // front turns an unchanged window into a bodyless 304 instead of the full
      // payload.
      const persisted = cacheSourceRef.current !== 'fresh' ? await bootstrap.snapshot : null;
      // Re-check after the await — a concurrent invocation (retryConnection)
      // may have landed a fresh fetch while the disk read was in flight.
      if (persisted && cacheSourceRef.current !== 'fresh') {
        cacheSourceRef.current = 'hydrated';
        etagRef.current = persisted.etag;
        setEventsCache((prev) => {
          // Only a cache that was empty ends up equal to the snapshot: the merge
          // deliberately keeps `prev`, so anything a screen upserted while the
          // disk read was in flight makes this a superset that still deserves
          // to be written back.
          cacheMirrorsSnapshotRef.current = Object.keys(prev).length === 0;
          return { ...toEventsMap(persisted.events), ...prev };
        });
      }

      let fetched: CacheableEventsFetch;
      try {
        fetched = await bootstrap.result;
      } catch (error) {
        // A speculative fetch runs before /app/config has confirmed the API
        // prefix and before the integrity gate has attested, so a non-network
        // rejection (stale prefix → 404, install token → 401) can just mean
        // "too early". Retry once now that both have resolved. A network
        // failure would only fail again, so that one is adopted as final.
        if (!bootstrap.speculative || isNetworkError(error)) throw error;
        logger.warn('[GlobalProvider] Speculative events fetch failed; retrying', {
          error: error instanceof Error ? error.message : String(error),
        });
        fetched = await fetchAllCacheableEvents(persisted?.etag);
      }

      const { events, lookbackDate, truncated, notModified, etag } = fetched;

      if (notModified) {
        // The window is unchanged, so the snapshot just painted IS current.
        // Keep it, skip the merge, and deliberately skip the re-persist: the
        // stored snapshot is already this data, and restamping it would reset
        // the hydration age-out that bounds how long it can be reused.
        cacheSourceRef.current = 'fresh';
        if (etag) etagRef.current = etag;
        // We only ever revalidate a snapshot that covered the window, and the
        // backend just confirmed that window is unchanged.
        windowTruncatedRef.current = false;
        logger.info('[GlobalProvider] Events cache revalidated — window unchanged (304)');
        return;
      }

      cacheSourceRef.current = 'fresh';
      cacheMirrorsSnapshotRef.current = false;
      etagRef.current = etag;
      windowTruncatedRef.current = truncated;
      setEventsCache((prev) => applyFreshEvents(prev, events, lookbackDate, truncated));
      logger.info('[GlobalProvider] Events cache initialized', { count: events.length });
    } catch (error) {
      logger.error('Failed to fetch events cache:', { error });
      if (isNetworkError(error)) {
        setConnectionError(true);
      }
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const retryConnection = useCallback(async (): Promise<void> => {
    setConnectionError(false);
    setLoading(true);
    setEventsLoading(true);
    await validateUserSession();
    await fetchInitialEvents();
  }, [validateUserSession, fetchInitialEvents]);

  useEffect(() => {
    validateUserSession();

    const handleTokenExpiration = async (reason?: string): Promise<void> => {
      await clearAuthState();

      const navigateToSignIn = () => router.replace('/(auth)/sign-in');

      if (reason === 'token_reuse') {
        Alert.alert(t('session.securityAlert'), t('session.securityAlertMessage'), [
          { text: t('session.signInAgain'), onPress: navigateToSignIn },
        ]);
      } else if (reason === 'session_replaced') {
        Alert.alert(t('session.signedInElsewhere'), t('session.signedInElsewhereMessage'), [
          { text: t('session.signInAgain'), onPress: navigateToSignIn },
        ]);
      } else {
        Alert.alert(t('session.expired'), t('session.expiredMessage'), [
          { text: t('session.signInAgain'), onPress: navigateToSignIn },
        ]);
      }
    };

    setTokenExpirationCallback(handleTokenExpiration);

    return () => {};
  }, [validateUserSession, clearAuthState]);

  useEffect(() => {
    fetchInitialEvents();
  }, [fetchInitialEvents]);

  const upsertEventInCache = useCallback((event: Event): void => {
    // The cache now holds something the snapshot doesn't — it's worth writing.
    cacheMirrorsSnapshotRef.current = false;
    setEventsCache((prev) => ({ ...prev, [event.$id]: event }));
  }, []);

  const removeEventFromCache = useCallback((eventId: string): void => {
    cacheMirrorsSnapshotRef.current = false;
    setEventsCache((prev) => {
      if (!(eventId in prev)) return prev;
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }, []);

  const refetchEvents = useCallback(async (): Promise<void> => {
    try {
      setEventsLoading(true);

      // Deliberately no If-None-Match: the ETag ignores the view/save/like
      // counters, so an explicit pull-to-refresh answered with 304 would leave
      // those counts frozen and read as a broken refresh.
      const { events, lookbackDate, truncated, etag } = await fetchAllCacheableEvents();

      cacheSourceRef.current = 'fresh';
      cacheMirrorsSnapshotRef.current = false;
      etagRef.current = etag;
      windowTruncatedRef.current = truncated;
      setEventsCache((prev) => applyFreshEvents(prev, events, lookbackDate, truncated));
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Mirror every fresh-data cache change (bulk fetches, screen upserts/removes)
  // into the cold-start snapshot, so events created or hydrated mid-session
  // survive a restart. Contents that came from disk are deliberately not written
  // back — see cacheSourceRef and cacheMirrorsSnapshotRef. An empty cache never
  // clobbers an existing snapshot.
  useEffect(() => {
    if (cacheSourceRef.current !== 'fresh') return;
    if (cacheMirrorsSnapshotRef.current) return;
    const events = Object.values(eventsCache);
    if (events.length === 0) return;
    void persistEvents(events, {
      etag: etagRef.current,
      coversWindow: !windowTruncatedRef.current,
    });
  }, [eventsCache]);

  const contextValue = useMemo(
    () => ({
      isLogged,
      setIsLogged,
      user,
      setUser,
      loading,
      setLoading,
      userLanguage,
      eventsCache,
      eventsLoading,
      refetchEvents,
      upsertEventInCache,
      removeEventFromCache,
      userEventCounts,
      userEventCountsLoading,
      refreshUserEventCounts,
      clearAuthState,
      connectionError,
      retryConnection,
    }),
    [
      isLogged,
      user,
      loading,
      userLanguage,
      eventsCache,
      eventsLoading,
      refetchEvents,
      upsertEventInCache,
      removeEventFromCache,
      userEventCounts,
      userEventCountsLoading,
      refreshUserEventCounts,
      clearAuthState,
      connectionError,
      retryConnection,
    ]
  );

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export default GlobalProvider;
